/**
 * ============================================================
 * 개인정보처리방침 (/privacy)
 * - 한국 개인정보보호법 + 정보통신망법 기반 표준 양식
 * - OAuth 검수 (Naver/Google)에서 필수로 요구
 * ============================================================
 */

import Layout from "@/components/layout/Layout";

const EFFECTIVE_DATE = "2026-04-01";

export default function PrivacyPage() {
  return (
    <Layout>
      <article className="max-w-3xl mx-auto py-4 space-y-6 text-sm leading-relaxed">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">개인정보처리방침</h1>
          <p className="mt-2 text-xs text-muted-foreground">시행일: {EFFECTIVE_DATE}</p>
        </header>

        <p>
          FlowStock(이하 "서비스")은 「개인정보 보호법」 및 「정보통신망 이용촉진 및 정보보호 등에 관한
          법률」 등 관련 법령을 준수하며, 이용자의 개인정보를 안전하게 보호하기 위해 다음과 같이
          개인정보처리방침을 수립·공개합니다.
        </p>

        <Section title="1. 수집하는 개인정보 항목 및 수집 방법">
          <p>서비스는 다음의 개인정보 항목을 수집합니다.</p>
          <Table
            headers={["수집 시점", "필수/선택", "항목", "수집 출처"]}
            rows={[
              ["소셜 로그인", "필수", "이메일 주소, 이름(닉네임)", "Google / Naver OAuth"],
              ["소셜 로그인", "선택", "프로필 이미지 URL", "Google / Naver OAuth"],
              ["서비스 이용 중", "자동 생성", "접속 IP, 브라우저 정보, 쿠키, 접속 일시", "이용자 단말"],
            ]}
          />
        </Section>

        <Section title="2. 개인정보의 수집 및 이용 목적">
          <ul className="list-disc pl-5 space-y-1">
            <li>회원 식별 및 본인 확인 (소셜 로그인)</li>
            <li>회원 페이지에서 사용자 이름·이메일 표시</li>
            <li>모의투자 포트폴리오, 관심종목 알림 등 개인화된 기능 제공</li>
            <li>서비스 부정 이용 방지, 보안 및 비인가 접근 차단</li>
            <li>고객 문의 응대 및 공지사항 전달</li>
          </ul>
        </Section>

        <Section title="3. 개인정보의 보유 및 이용 기간">
          <p>
            서비스는 회원 탈퇴 시 또는 수집 목적이 달성된 즉시 개인정보를 지체 없이 파기합니다.
            단, 관련 법령에 의해 보존이 필요한 경우 해당 법령이 정한 기간 동안 보관합니다.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>전자상거래 등에서의 소비자보호에 관한 법률에 따른 표시·광고 기록: 6개월</li>
            <li>통신비밀보호법에 따른 접속 로그: 3개월</li>
          </ul>
        </Section>

        <Section title="4. 개인정보의 제3자 제공">
          <p>
            서비스는 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 법령에 따라 수사기관의
            적법한 요청이 있는 경우 등 예외적인 경우에 한해 제공할 수 있습니다.
          </p>
        </Section>

        <Section title="5. 개인정보 처리의 위탁">
          <p>서비스는 안정적 운영을 위해 다음과 같이 개인정보 처리 업무를 위탁합니다.</p>
          <Table
            headers={["수탁자", "위탁 업무"]}
            rows={[
              ["Cloudflare, Inc.", "CDN, DNS, 보안 (이용자 접근 로그 일시 저장)"],
              ["Anthropic, PBC", "AI 분석 처리 (이용자 식별 정보는 전송하지 않음)"],
            ]}
          />
        </Section>

        <Section title="6. 이용자 권리와 행사 방법">
          <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>개인정보 열람·정정·삭제 요구</li>
            <li>처리정지 요구</li>
            <li>회원 탈퇴 (서비스 내 마이페이지에서 즉시 가능)</li>
          </ul>
          <p>
            권리 행사는 서비스 내 마이페이지(<a className="text-primary hover:underline" href="/me">/me</a>)에서
            직접 처리하거나 아래 연락처로 문의 시 지체 없이 조치합니다.
          </p>
        </Section>

        <Section title="7. 개인정보의 안전성 확보 조치">
          <ul className="list-disc pl-5 space-y-1">
            <li>전송 구간 TLS 1.2 이상 암호화</li>
            <li>OAuth 토큰은 단방향 해시 또는 암호화 보관, 액세스 토큰 저장 안 함</li>
            <li>관리자 권한 최소화, 접근 통제</li>
            <li>웹 방화벽 및 침입 차단 시스템 운영 (Cloudflare)</li>
          </ul>
        </Section>

        <Section title="8. 쿠키의 사용">
          <p>
            서비스는 로그인 세션 유지 및 사용자 환경(테마, 모의투자 포트폴리오) 보존을 위해 쿠키 및
            브라우저 로컬스토리지를 사용합니다. 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수
            있으나, 이 경우 일부 서비스 이용이 제한될 수 있습니다.
          </p>
        </Section>

        <Section title="9. 개인정보 보호 책임자">
          <ul className="list-disc pl-5 space-y-1">
            <li>책임자: FlowStock 운영자</li>
            <li>이메일: <a className="text-primary hover:underline" href="mailto:eficar@eficar.co.kr">eficar@eficar.co.kr</a></li>
          </ul>
        </Section>

        <Section title="10. 방침의 변경">
          <p>
            본 개인정보처리방침은 법령·정책 또는 보안 기술의 변경에 따라 내용 변경이 있을 수 있으며,
            변경 시 시행 7일 전 서비스 공지를 통해 안내합니다.
          </p>
        </Section>

        <p className="pt-4 text-xs text-muted-foreground">
          본 방침은 {EFFECTIVE_DATE}부터 적용됩니다.
        </p>
      </article>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-bold tracking-tight">{title}</h2>
      <div className="text-foreground/90 space-y-2">{children}</div>
    </section>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border border-border rounded-lg">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left py-2 px-3 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-t border-border">
              {row.map((cell, ci) => (
                <td key={ci} className="py-2 px-3 align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
