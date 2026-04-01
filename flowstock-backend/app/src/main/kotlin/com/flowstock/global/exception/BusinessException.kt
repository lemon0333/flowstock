package com.flowstock.global.exception

class BusinessException(val errorCode: ErrorCode) : RuntimeException(errorCode.message)
