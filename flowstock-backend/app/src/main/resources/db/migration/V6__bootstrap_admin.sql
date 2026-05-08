-- 첫 admin 부트스트랩.
-- 운영자 단일화: 이후 admin grant/revoke는 admin-only API로.
-- 같은 row가 이미 ADMIN이면 영향 없음 (멱등).
UPDATE members
SET role = 'ADMIN'
WHERE email = 'andyhyunbin@gmail.com';
