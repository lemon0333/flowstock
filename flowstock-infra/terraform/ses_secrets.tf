# ─────────────────────────────────────────
# SES — 이메일 알림
# ─────────────────────────────────────────
resource "aws_ses_domain_identity" "flowstock" {
  domain = var.domain_name
}

resource "aws_route53_record" "ses_verification" {
  zone_id = aws_route53_zone.flowstock.zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.flowstock.verification_token]
}

resource "aws_ses_domain_identity_verification" "flowstock" {
  domain = aws_ses_domain_identity.flowstock.id

  depends_on = [aws_route53_record.ses_verification]
}

resource "aws_ses_domain_dkim" "flowstock" {
  domain = aws_ses_domain_identity.flowstock.domain
}

resource "aws_route53_record" "ses_dkim" {
  count   = 3
  zone_id = aws_route53_zone.flowstock.zone_id
  name    = "${aws_ses_domain_dkim.flowstock.dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.flowstock.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_ses_email_identity" "sender" {
  email = var.ses_email
}

# ─────────────────────────────────────────
# Secrets Manager — API 키 관리
# ─────────────────────────────────────────
resource "aws_secretsmanager_secret" "flowstock" {
  name                    = "flowstock/${var.environment}/secrets"
  description             = "FlowStock API Keys and Secrets"
  recovery_window_in_days = 7

  tags = {
    Name        = "flowstock-secrets"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "flowstock" {
  secret_id = aws_secretsmanager_secret.flowstock.id

  secret_string = jsonencode({
    KIS_APP_KEY        = "YOUR_KIS_APP_KEY"
    KIS_APP_SECRET     = "YOUR_KIS_APP_SECRET"
    DART_API_KEY       = "YOUR_DART_API_KEY"
    CLAUDE_API_KEY     = "YOUR_CLAUDE_API_KEY"
    JWT_SECRET         = "YOUR_JWT_SECRET"
    DB_PASSWORD        = "YOUR_DB_PASSWORD"
    REDIS_PASSWORD     = "YOUR_REDIS_PASSWORD"
  })

  lifecycle {
    ignore_changes = [secret_string] # 실제 값은 콘솔/CLI에서 업데이트
  }
}

# ─────────────────────────────────────────
# IAM — Spring Boot가 Secrets Manager 접근용
# ─────────────────────────────────────────
resource "aws_iam_policy" "secrets_access" {
  name        = "flowstock-secrets-access"
  description = "Allow FlowStock backend to read secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = aws_secretsmanager_secret.flowstock.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${aws_s3_bucket.assets.arn}/*",
          "${aws_s3_bucket.backup.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_user" "flowstock_backend" {
  name = "flowstock-backend-${var.environment}"

  tags = {
    Name = "flowstock-backend"
  }
}

resource "aws_iam_user_policy_attachment" "backend_secrets" {
  user       = aws_iam_user.flowstock_backend.name
  policy_arn = aws_iam_policy.secrets_access.arn
}

resource "aws_iam_access_key" "flowstock_backend" {
  user = aws_iam_user.flowstock_backend.name
}
