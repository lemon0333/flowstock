---
name: deploy-front
description: 프론트엔드 빌드 → S3 업로드 → CloudFront 캐시 무효화
---

FlowStock 프론트엔드를 프로덕션 배포합니다.

## 단계

1. **빌드**:
   ```bash
   cd flowstock-front && npm run build
   ```
   빌드 실패 시 에러 분석 후 수정 시도.

2. **S3 업로드**:
   ```bash
   aws s3 sync dist/ s3://flowstock-frontend --delete
   ```

3. **CloudFront 캐시 무효화**:
   ```bash
   aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"
   ```
   Distribution ID는 `flowstock-infra/terraform/` 에서 확인.

4. **검증**:
   - `curl -sI https://flowstock.info` 로 200 응답 확인
   - 배포 완료 요약 출력

## 주의사항
- AWS 자격증명이 설정되어 있어야 함 (`aws sts get-caller-identity` 로 확인)
- 빌드 전 `npm ci` 로 의존성 정합성 확인
- 환경변수 (`VITE_*`) 가 올바르게 설정되어 있는지 확인
