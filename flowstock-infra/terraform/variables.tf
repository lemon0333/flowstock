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

variable "alert_recipient_emails" {
  description = "Grafana alert 수신 이메일 목록. SES sandbox에서 발송 가능하려면 verified identity 필요. .env의 TF_VAR_alert_recipient_emails로 주입 (이메일 코드 하드코딩 회피)."
  type        = list(string)
  default     = []
}
