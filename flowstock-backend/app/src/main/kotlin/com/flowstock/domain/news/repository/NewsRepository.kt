package com.flowstock.domain.news.repository

import com.flowstock.domain.news.entity.News
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface NewsRepository : JpaRepository<News, Long> {

    @Query("SELECT n FROM News n LEFT JOIN FETCH n.stockRelations sr LEFT JOIN FETCH sr.stock WHERE n.id = :id")
    fun findByIdWithRelations(id: Long): News?

    fun findAllByOrderByPublishedAtDesc(pageable: PageRequest): Page<News>
}

fun NewsRepository.findLatestNews(page: Int, size: Int): Page<News> =
    findAllByOrderByPublishedAtDesc(PageRequest.of(page, size))
