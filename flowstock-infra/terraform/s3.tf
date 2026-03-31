# ─────────────────────────────────────────
# 프론트엔드 정적 파일 버킷
# ─────────────────────────────────────────
resource "aws_s3_bucket" "frontend" {
  bucket = "flowstock-frontend-${var.environment}"

  tags = {
    Name        = "flowstock-frontend"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    status = "Enabled"
  }
}

# CloudFront만 접근 가능하도록 OAC 설정
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontAccess"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
}

# ─────────────────────────────────────────
# DB 백업 버킷
# ─────────────────────────────────────────
resource "aws_s3_bucket" "backup" {
  bucket = "flowstock-backup-${var.environment}"

  tags = {
    Name        = "flowstock-backup"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id

  rule {
    id     = "delete-old-backups"
    status = "Enabled"

    expiration {
      days = 30 # 30일 이후 자동 삭제
    }
  }
}

resource "aws_s3_bucket_public_access_block" "backup" {
  bucket = aws_s3_bucket.backup.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─────────────────────────────────────────
# 이미지/파일 업로드 버킷
# ─────────────────────────────────────────
resource "aws_s3_bucket" "assets" {
  bucket = "flowstock-assets-${var.environment}"

  tags = {
    Name        = "flowstock-assets"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
