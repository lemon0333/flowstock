# ─────────────────────────────────────────
# Route53 Hosted Zone
# ─────────────────────────────────────────
resource "aws_route53_zone" "flowstock" {
  name = var.domain_name

  tags = {
    Name = "flowstock-zone"
  }
}

# ─────────────────────────────────────────
# ACM 인증서 DNS 검증 레코드
# ─────────────────────────────────────────
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.flowstock.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = aws_route53_zone.flowstock.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

# ─────────────────────────────────────────
# 루트 도메인 → CloudFront
# ─────────────────────────────────────────
resource "aws_route53_record" "root" {
  zone_id = aws_route53_zone.flowstock.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.flowstock.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

# ─────────────────────────────────────────
# api 서브도메인 → 온프레미스 (Cloudflare Tunnel)
# Cloudflare Tunnel 연결 후 실제 IP/CNAME 업데이트 필요
# ─────────────────────────────────────────
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.flowstock.zone_id
  name    = "api.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = ["placeholder.cfargotunnel.com"] # Cloudflare Tunnel 연결 후 교체
}
