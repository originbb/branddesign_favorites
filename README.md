# 브랜드전략디자인팀의 즐겨찾기

팀 공유 즐겨찾기 보드. 팀원은 누구나 보고, 관리자만 추가/수정/삭제/정렬.

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # DATABASE_URL, ADMIN_TOKEN 채우기
npm run dev
```

## 배포 (Vercel + Neon)

1. **Neon**에서 무료 Postgres 프로젝트 생성 → 연결 문자열 복사.
2. Neon SQL 에디터에 `db/schema.sql` 내용을 붙여 실행 (테이블 생성). 선택 사항으로 `db/seed.sql`을 실행하면 예시 시작 카테고리가 추가됩니다.
3. **GitHub**에 이 저장소 push.
4. **Vercel**에서 New Project → GitHub 저장소 import.
5. Vercel 프로젝트 환경변수 설정:
   - `DATABASE_URL` = Neon 연결 문자열
   - `ADMIN_TOKEN` = 길고 추측 불가능한 비밀 문자열
6. Deploy.

## 사용법

- 보기: 배포된 주소(`https://...vercel.app/`) — 팀에 공유.
- 관리: `https://...vercel.app/manage?key=<ADMIN_TOKEN>` 로 한 번 접속하면
  쿠키에 저장되어 그 기기에선 이후 `/manage` 만으로 관리 가능.
- 관리 모드에서 카테고리/북마크 추가·수정·삭제, 드래그로 순서 변경.
