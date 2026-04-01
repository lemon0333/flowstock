variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "ap-northeast-2" # 서울
}

variable "domain_name" {
  description = "FlowStock 도메인"
  type        = string
  default     = "flowstock.info"
}

variable "environment" {
  description = "환경 (prod / dev)"
  type        = string
  default     = "prod"
}

variable "ses_email" {
  description = "SES 발신 이메일"
  type        = string
}
