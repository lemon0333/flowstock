-- Hibernate 6의 Double 매핑은 NUMERIC이 아니라 double precision(=float8)을 기대하므로
-- 부동소수점 컬럼 타입을 일치시킨다. (Schema-validation 실패 방지)
ALTER TABLE news_stock_relations
    ALTER COLUMN impact_score TYPE double precision USING impact_score::double precision;
