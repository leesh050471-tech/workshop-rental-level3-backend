# 모아공방 장비 대여 · 백엔드 (Level 3)

공유 작업실 장비 예약 API입니다 (NestJS + PostgreSQL + JWT 로그인 + GPT). 기획서는 `기획서.md`를 보세요.

> ⏳ 무료 서버(Render)라 **15분 동안 쓰지 않으면 잠들어, 첫 접속이 1분 가까이 걸릴 수 있습니다.** 고장이 아닙니다.

## 확인 주소
- `/health` : 서버와 DB 연결 상태

## 백엔드가 지키는 규칙
1. 같은 장비는 시간이 겹치게 예약 불가
2. 한 회원은 진행 중·예정 예약 최대 2건
3. 1~4시간, 09~21시, 오늘부터 7일 이내
4. 고장 장비는 예약 불가
5. 회원은 내 예약만, 관리자 기능은 관리자만

## 설정값 (환경 변수)
| 이름 | 뜻 |
|---|---|
| `DATABASE_URL` | Render Postgres 주소 (Render 서버에는 Internal 주소) |
| `DB_SCHEMA` | 이 앱이 쓰는 DB 공간 이름 (`level3`) |
| `FRONTEND_URL` | 접속을 허용할 프론트엔드 주소 |
| `JWT_SECRET` | 로그인 토큰 서명용 비밀 문자열 |
| `GPT_API_KEY` | OpenAI API 키 (AI 기능, 백엔드에만 둠) |
| `GPT_MODEL` | 사용할 모델 (기본 `gpt-4o-mini`) |

## Render 설정
- Build Command: `npm install --include=dev && npm run build`
- Start Command: `npm run start`

## 로컬 실행
```bash
cp .env.example .env   # 값을 채운 뒤
npm install
npm run start:dev
```
