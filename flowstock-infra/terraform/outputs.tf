output "cloudfront_domain" {
  description = "CloudFront 배포 도메인"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_id" {
  description = "CloudFront Distribution ID (배포 시 캐시 무효화용)"
  value       = aws_cloudfront_distribution.frontend.id
}

output "frontend_bucket" {
  description = "프론트엔드 S3 버킷 이름"
  value       = aws_s3_bucket.frontend.bucket
}

output "backup_bucket" {
  description = "백업 S3 버킷 이름"
  value       = aws_s3_bucket.backup.bucket
}

output "assets_bucket" {
  description = "에셋 S3 버킷 이름"
  value       = aws_s3_bucket.assets.bucket
}

output "route53_nameservers" {
  description = "도메인 등록대행사에 등록할 네임서버"
  value       = aws_route53_zone.flowstock.name_servers
}

output "secrets_arn" {
  description = "Secrets Manager ARN"
  value       = aws_secretsmanager_secret.flowstock.arn
}

output "iam_access_key_id" {
  description = "백엔드 IAM Access Key (k8s Secret에 등록)"
  value       = aws_iam_access_key.flowstock_backend.id
  sensitive   = true
}

output "iam_secret_access_key" {
  description = "백엔드 IAM Secret Key (k8s Secret에 등록)"
  value       = aws_iam_access_key.flowstock_backend.secret
  sensitive   = true
}
