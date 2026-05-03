/**
 * ============================================================
 * 이용약관 (/terms)
 * - 서비스 이용 규칙 + 면책 + 책임 한계
 * - OAuth 검수 시 종종 요구됨
 * ============================================================
 */

import Layout from "@/components/layout/Layout";

const EFFECTIVE_DATE = "2026-04-01";

export default function TermsPage() {
  return (
    <Layout>
      <article className="max-w-3xl mx-auto py-4 space-y-6 text-sm leading-relaxed">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">이용약관</h1>
          <p className="mt-2 text-xs text-muted-foreground">시행일: {EFFECTIVE_DATE}</p>
        </header>

        <Section title="제1조 (목적)">
          <p>
            본 약관은 FlowStock(이하 "서비스")이 제공하는 한국 주식 시장 분석 정보 및 모의투자 도구의
            이용 조건과 절차, 이용자의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
          </p>
        </Section>

        <Section title="제2조 (정의)">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>이용자</strong>: 본 약관에 따라 서비스를 이용하는 모든 사람.</li>
            <li><strong>회원</strong>: 소셜 로그인으로 인증한 이용자.</li>
            <li><strong>모의투자</strong>: 가상의 잔고로 주식 매매를 시뮬레이션하는 기능. 실거래와 무관함.</li>
          </ul>
        </Section>

        <Section title="제3조 (약관의 효력 및 변경)">
          <p>
            본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다. 서비스는 약관을 변경할 수 있으며,
            변경 시 시행일 7일 전(이용자에게 불리한 변경의 경우 30일 전)에 공지합니다.
          </p>
        </Section>

        <Section title="제4조 (서비스의 제공)">
          <p>서비스는 다음의 기능을 제공합니다.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>국내 주식 시세, 지수, 매매주체 동향 등 시장 정보 제공</li>
            <li>뉴스 RSS 수집 및 종목 매핑, AI 기반 감성 분석</li>
            <li>모의투자 포트폴리오, 백테스터, 스크리너, 종목 비교 도구</li>
            <li>관심종목 알림 (브라우저 Notification API)</li>
          </ul>
        </Section>

        <Section title="제5조 (회원가입과 탈퇴)">
          <p>
            서비스는 별도의 회원가입 없이 Google 또는 Naver 소셜 로그인으로 이용 가능합니다. 첫 로그인
            시 자동으로 회원이 생성됩니다. 이용자는 마이페이지에서 언제든지 탈퇴할 수 있으며, 탈퇴
            시 모든 개인정보가 즉시 삭제됩니다.
          </p>
        </Section>

        <Section title="제6조 (이용자의 의무)">
          <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>타인의 계정 도용 또는 허위 정보 등록</li>
            <li>서비스의 운영을 방해하는 일체의 행위 (자동화 크롤링, 비정상 트래픽 등)</li>
            <li>서비스 콘텐츠를 무단 복제·배포·상업적 이용</li>
            <li>관계 법령 위반 행위 (시세 조작, 미공개 정보 이용 등)</li>
          </ul>
        </Section>

        <Section title="제7조 (정보의 정확성과 면책)">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>투자 정보의 한계</strong>: 서비스가 제공하는 모든 데이터는 정보 제공용이며,
              투자 권유나 투자 자문에 해당하지 않습니다. 매매 결정과 그 결과에 대한 책임은 전적으로
              이용자에게 있습니다.
            </li>
            <li>
              <strong>데이터 정확성</strong>: 시세·뉴스·재무 데이터는 외부 출처(네이버 금융, DART, RSS
              등)에서 수집되며 지연·오류가 있을 수 있습니다. 서비스는 데이터의 정확성·완전성·
              적시성을 보장하지 않습니다.
            </li>
            <li>
              <strong>모의투자</strong>: 가상의 잔고이며 실거래와 무관합니다. 모의투자 결과가 실거래
              수익을 보장하지 않습니다.
            </li>
            <li>
              <strong>서비스 중단</strong>: 정기 점검, 시스템 장애, 외부 API 장애 등으로 서비스가
              일시 중단될 수 있으며, 이로 인한 손실에 대해 서비스는 책임지지 않습니다.
            </li>
          </ul>
        </Section>

        <Section title="제8조 (지적재산권)">
          <p>
            서비스 내 자체 제작 콘텐츠(분석 알고리즘, UI 디자인, 시각화 등)의 저작권은 운영자에게
            귀속됩니다. 이용자가 커뮤니티에 게시한 글의 저작권은 작성자에게 귀속하나, 서비스는 해당
            게시물을 서비스 운영 목적으로 활용할 수 있습니다.
          </p>
        </Section>

        <Section title="제9조 (계약 해지 및 이용 제한)">
          <p>
            서비스는 이용자가 본 약관 또는 관련 법령을 위반한 경우 사전 통지 없이 이용을 제한하거나
            계정을 삭제할 수 있습니다.
          </p>
        </Section>

        <Section title="제10조 (분쟁 해결)">
          <p>
            본 약관과 관련된 분쟁은 대한민국 법령에 따라 해결하며, 관할 법원은 민사소송법에 따른 법원으로
            합니다.
          </p>
        </Section>

        <Section title="제11조 (문의)">
          <p>
            서비스 이용 관련 문의는{" "}
            <a className="text-primary hover:underline" href="mailto:eficar@eficar.co.kr">
              eficar@eficar.co.kr
            </a>{" "}
            로 보내주시기 바랍니다.
          </p>
        </Section>

        <p className="pt-4 text-xs text-muted-foreground">
          본 약관은 {EFFECTIVE_DATE}부터 적용됩니다.
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
