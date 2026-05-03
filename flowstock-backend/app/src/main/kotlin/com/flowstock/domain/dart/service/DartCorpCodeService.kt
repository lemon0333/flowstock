package com.flowstock.domain.dart.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.web.reactive.function.client.WebClient
import java.io.ByteArrayInputStream
import java.time.Duration
import java.util.concurrent.atomic.AtomicReference
import java.util.zip.ZipInputStream
import javax.xml.parsers.DocumentBuilderFactory

/**
 * DART corpCode.xml(.zip) 을 한 번 받아 ticker(stock_code) → corp_code 매핑을 메모리에 캐싱.
 *
 * - 첫 lookup() 호출 시 lazy 로드 (앱 부팅 차단 안 함).
 * - 키 없거나 다운로드 실패 시 빈 맵으로 두고 호출자가 mock 폴백.
 * - 한국 거래소 상장사만 stock_code가 6자리로 채워져 있어서, 그 케이스만 매핑.
 */
@Service
class DartCorpCodeService(
    @Value("\${dart.api-key:}") private val apiKey: String,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private val cache = AtomicReference<Map<String, String>>(emptyMap())

    @Volatile
    private var loaded = false

    private val client: WebClient = WebClient.builder()
        .baseUrl("https://opendart.fss.or.kr/api")
        .codecs { it.defaultCodecs().maxInMemorySize(20 * 1024 * 1024) }
        .build()

    fun lookup(ticker: String): String? {
        if (apiKey.isBlank()) return null
        if (!loaded) {
            synchronized(this) {
                if (!loaded) {
                    cache.set(loadCorpCodes())
                    loaded = true
                }
            }
        }
        val key = ticker.trim().padStart(6, '0')
        return cache.get()[key]
    }

    private fun loadCorpCodes(): Map<String, String> {
        return try {
            val bytes = client.get()
                .uri { it.path("/corpCode.xml").queryParam("crtfc_key", apiKey).build() }
                .retrieve()
                .bodyToMono(ByteArray::class.java)
                .timeout(Duration.ofSeconds(30))
                .block() ?: return emptyMap<String, String>().also {
                log.warn("DART corpCode.xml: empty response")
            }

            val map = HashMap<String, String>(4096)
            ZipInputStream(ByteArrayInputStream(bytes)).use { zis ->
                var entry = zis.nextEntry
                while (entry != null) {
                    if (entry.name.endsWith(".xml")) {
                        val xml = zis.readBytes()
                        val factory = DocumentBuilderFactory.newInstance().apply {
                            isNamespaceAware = false
                            // XXE 차단
                            setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)
                        }
                        val doc = factory.newDocumentBuilder().parse(ByteArrayInputStream(xml))
                        val items = doc.getElementsByTagName("list")
                        for (i in 0 until items.length) {
                            val node = items.item(i) as? org.w3c.dom.Element ?: continue
                            val stockCode = node.firstText("stock_code")
                            val corpCode = node.firstText("corp_code")
                            if (!stockCode.isNullOrBlank() && stockCode.length == 6 &&
                                !corpCode.isNullOrBlank()
                            ) {
                                map[stockCode] = corpCode
                            }
                        }
                    }
                    entry = zis.nextEntry
                }
            }
            log.info("DART corp codes loaded: {} entries", map.size)
            map
        } catch (e: Exception) {
            log.warn("DART corp code load failed: {}", e.message)
            emptyMap()
        }
    }

    private fun org.w3c.dom.Element.firstText(tag: String): String? {
        val nl = this.getElementsByTagName(tag)
        if (nl.length == 0) return null
        return nl.item(0).textContent?.trim()
    }
}
