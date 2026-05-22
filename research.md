# ACRYL Intelligence Brief — 시스템 리서치 보고서

> 작성일: 2026-05-22
> 대상 코드베이스: `/home/user/News` (Next.js 15 App Router)

---

## 1. 시스템 개요

### 1.1 기술 스택

| 레이어 | 기술 | 버전 | 용도 |
|--------|------|------|------|
| Framework | Next.js (App Router) | 15.3 | SSR/API 라우트 |
| UI | React | 19.1 | 대시보드 SPA |
| 스타일링 | Tailwind CSS | 4.0 | 유틸리티 CSS |
| DB | Supabase (PostgreSQL) | 2.49 | 주 저장소 |
| 폴백 저장소 | Local JSON Store | 자체구현 | Vercel /tmp 대응 |
| AI | Anthropic Claude API | 0.39 | 큐레이션/분석/트렌드 |
| 이메일 | Resend | 4.1 | 뉴스레터 발송 |
| RSS | rss-parser | 3.13 | 피드 수집 |
| 언어 | TypeScript | 5.8 | Strict 모드 |
| 빌드 | Turbopack | - | 개발 서버 |
| 배포 | Vercel | - | Serverless |

### 1.2 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                      수집 레이어 (6 병렬)                        │
│  ┌─────────┐ ┌──────────┐ ┌────────────┐ ┌──────┐ ┌─────┐ ┌──┐│
│  │RSS 피드 │ │웹서치    │ │Google News │ │학술  │ │정부 │ │..││
│  │(rss-    │ │(Claude   │ │(RSS)       │ │(arXiv│ │(정책│ │  ││
│  │parser)  │ │API)      │ │            │ │등)   │ │크롤│ │  ││
│  └────┬────┘ └────┬─────┘ └─────┬──────┘ └──┬───┘ └──┬──┘ └┬─┘│
└───────┼──────────┼───────────┼──────────┼────────┼──────┼──────┘
        └──────────┴───────────┴──────────┴────────┴──────┘
                               │
                    ┌──────────▼──────────┐
                    │   중복제거 (URL+제목) │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  기본 큐레이션       │  ← Claude Sonnet (배치 30건)
                    │  스코어링 (0-10점)   │    점수, 긴급도, 카테고리
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  심층 큐레이션       │  ← Claude Sonnet (배치 10건)
                    │  (score ≥ 7만)       │    심층요약, 핵심발견, 액션
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  dedup_group 병합    │  그룹 내 최고점 유지
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──────┐ ┌──────▼──────┐ ┌───────▼──────┐
    │ 트렌드 탐지    │ │ 경영 브리프  │ │ 뉴스레터     │
    │ (상위 60건)    │ │ (상위 50건)  │ │ HTML 렌더링  │
    └────────────────┘ └─────────────┘ └──────┬───────┘
                                              │
                                    ┌─────────▼────────┐
                                    │   이메일 발송     │
                                    │   (Resend API)    │
                                    └──────────────────┘
```

### 1.3 데이터베이스 스키마

| 테이블 | 용도 | 핵심 필드 |
|--------|------|-----------|
| `sources` | 뉴스 소스 설정 | name, url, type(rss/websearch), content_type, category, enabled |
| `keyword_groups` | 검색 키워드 그룹 | group_name, category, keywords[], priority, enabled |
| `articles` | 수집/큐레이션된 기사 | title, url, relevance_score(0-10), urgency(red/yellow/green), deep_summary, key_findings[], action_items[] |
| `trends` | 탐지된 트렌드 | trend_title, trend_description, strength(rising/emerging/stable), related_article_ids[] |
| `pipeline_runs` | 파이프라인 실행 이력 | batch_id, status, executive_brief, articles_count, started_at, completed_at |
| `recipients` | 뉴스레터 수신자 | name, email, role, enabled |

### 1.4 핵심 파일 구조

```
lib/
├── pipeline.ts          (325줄) 파이프라인 오케스트레이션
├── collector.ts         (127줄) 수집기 통합 + 중복제거
├── collector-rss.ts              RSS 피드 수집
├── collector-websearch.ts        Claude 웹서치 수집
├── collector-google-news.ts      Google News RSS
├── collector-research.ts         학술 논문 수집
├── collector-gov.ts              정부 정책 수집
├── curator.ts           (263줄) AI 큐레이션 (기본+심층)
├── prompts.ts           (343줄) 모든 AI 프롬프트
├── trend-detector.ts    (139줄) 트렌드 탐지
├── executive-brief.ts   (134줄) 경영 브리프 생성
├── newsletter.ts        (245줄) HTML 뉴스레터 렌더링
├── newsletter-markdown.ts        Markdown 뉴스레터 렌더링
├── sender.ts            (82줄)  이메일 발송 (Resend)
├── supabase.ts                  DB 클라이언트 + 타입 정의
├── local-store.ts               JSON 파일 폴백 저장소
├── migrate.ts                   DB 마이그레이션 + 프리셋 동기화
└── default-presets.ts           프리셋 소스/키워드 (Single Source of Truth)

app/
├── page.tsx             대시보드 (탭 기반 SPA)
├── newsletter/page.tsx  뉴스레터 뷰어
├── demo/page.tsx        데모 데이터 페이지
└── api/
    ├── pipeline/run     파이프라인 실행
    ├── pipeline/test    테스트 실행
    ├── pipeline/logs    실행 로그
    ├── articles/latest  최신 기사 조회
    ├── newsletter/preview  뉴스레터 미리보기
    ├── newsletter/download 마크다운 다운로드
    ├── analysis/run     AI 분석 실행
    ├── sources/         소스 CRUD
    ├── keywords/        키워드 CRUD
    ├── recipients/      수신자 CRUD
    ├── presets/apply    프리셋 일괄 적용
    ├── setup/           DB 초기 설정
    ├── cron/daily       일일 자동 실행
    └── brief/test       브리프 테스트

components/
├── NewsTable.tsx        기사 목록 (긴급도별 그룹)
├── AIAnalysis.tsx       AI 분석 뷰어
├── SourcesManager.tsx   소스 관리
├── KeywordsManager.tsx  키워드 관리
├── RecipientsManager.tsx 수신자 관리
├── PipelineLogs.tsx     파이프라인 로그
└── Toast.tsx            알림 컴포넌트
```

---

## 2. 데이터 파이프라인 상세 분석

### 2.1 수집기 (Collectors)

6개 수집기가 `Promise.allSettled()`로 **병렬 실행**됨 (`collector.ts`).

| 수집기 | 소스 | 방식 | 특성 |
|--------|------|------|------|
| RSS | 전자신문, ZDNet, TechCrunch, arXiv 등 11+ | `rss-parser` | 피드 URL 직접 파싱 |
| WebSearch | 학회, 컨설팅, 정부기관 등 40+ | Claude API (tool_use) | content_type별 프롬프트 분리 |
| Google News | 키워드 기반 Google News RSS | RSS URL 동적 생성 | 키워드 → Google News RSS URL 변환 |
| Research | arXiv, ICLR, NeurIPS 등 12 키워드셋 | Claude API (tool_use) | 학술 전용 프롬프트 |
| Government | 과기정통부, NIPA 등 6 키워드셋 | Claude API (tool_use) | 정부R&D 전용 프롬프트 |
| DART | 한국 공시 API | REST API | DART_API_KEY 필요 (선택) |

**중복제거 로직** (`collector.ts`):
- URL 정규화: 쿼리 파라미터, 해시, 트레일링 슬래시 제거 + 호스트 소문자화
- 제목 정규화: 공백/특수문자 제거 + 소문자 + 첫 60자
- Set 기반 O(n) 중복 판별

### 2.2 큐레이션 시스템

#### 기본 큐레이션 (`curator.ts:curateArticles`)
- **배치 크기**: 30건
- **배치 간 딜레이**: 1,500ms
- **모델**: `claude-sonnet-4-20250514`
- **max_tokens**: 4,096
- **출력**: relevance_score, urgency, category, impact_comment, title_ko, summary_ko, dedup_group

**스코어링 체계** (`prompts.ts:CURATION_PROMPT`):

```
관련도 = 직접성(0-4) + 영향력(0-3) + 긴급성(0-2) + 품질(0-1) = 최대 10점

긴급도 매핑:
  8-10점 → red (즉시 대응)
  5-7점  → yellow (주의 관찰)
  1-4점  → green (참고)
```

| 축 | 배점 | 기준 |
|-----|------|------|
| 직접성 | 0-4 | ACRYL 제품/경쟁사/파트너 직접 언급 여부 |
| 영향력 | 0-3 | 매출, 전략, 시장 포지션 변화 가능성 |
| 긴급성 | 0-2 | 즉시 대응 필요 vs 장기 참고 |
| 품질 | 0-1 | 소스 신뢰도, 데이터 구체성 |

#### 심층 큐레이션 (`curator.ts:deepCurateArticles`)
- **대상**: relevance_score ≥ 7 && deep_summary 없는 기사
- **배치 크기**: 10건
- **배치 간 딜레이**: 2,000ms
- **출력**: deep_summary (3-5문장), source_description, key_findings[] (3-5개), action_items[]

### 2.3 트렌드 탐지

- **입력**: 관련도 상위 60건
- **모델**: Claude Sonnet, 4,096 tokens
- **출력**: 3-5개 트렌드 (trend_title, trend_description, strength, related_article_ids)
- **강도 분류**: rising(급부상) / emerging(신흥) / stable(지속)

### 2.4 경영 브리프

- **입력**: 관련도 상위 50건
- **모델**: Claude Sonnet, 2,048 tokens
- **태그 형식**: `[긴급 대응]`, `[시장 시그널]`, `[기회 포착]`, `[주간 맥락]`
- **추출 전략**: JSON 파싱 → 태그 정규식 → KV 정규식 → 플레인텍스트 (4단계 폴백)

### 2.5 Claude API 비용 추정

| 단계 | 호출 수 (50건 기준) | 입력 토큰 | 출력 토큰 | 예상 비용 |
|------|---------------------|-----------|-----------|-----------|
| 기본 큐레이션 | 2 배치 | ~15K | ~8K | ~$0.10 |
| 심층 큐레이션 | 1-2 배치 | ~10K | ~8K | ~$0.08 |
| 웹서치 수집 | 40+ 소스 | ~80K | ~60K | ~$0.60 |
| 트렌드 탐지 | 1 호출 | ~8K | ~4K | ~$0.05 |
| 경영 브리프 | 1 호출 | ~6K | ~2K | ~$0.03 |
| **합계** | | | | **~$0.86/회** |

> 일 1회 실행 기준 월 ~$26. 웹서치 수집이 비용의 70%를 차지.

---

## 3. 프론트엔드/API 구조

### 3.1 대시보드 탭 구성

| 탭 | 컴포넌트 | 기능 |
|----|----------|------|
| 📰 뉴스레터 | NewsTable | 기사 목록 (긴급도별), 수집 실행, MD 다운로드 |
| 🤖 AI 분석 | AIAnalysis | 경영 브리프 표시, AI 분석 실행 |
| 🔗 소스 | SourcesManager | 소스 CRUD, 프리셋 추가, AI 추천 |
| 🔑 키워드 | KeywordsManager | 키워드 그룹 CRUD, 프리셋, AI 추천 |
| 👥 수신자 | RecipientsManager | 수신자 관리, 테스트 발송 |
| 📋 로그 | PipelineLogs | 파이프라인 실행 이력 |

### 3.2 프리셋 자동 반영 아키텍처

```
┌───────────────────────────────────┐
│   lib/default-presets.ts          │  ← Single Source of Truth
│   DEFAULT_SOURCES (132개)         │
│   DEFAULT_KEYWORD_GROUPS (19개)   │
└──────┬────────────┬───────────────┘
       │            │
  ┌────▼────┐  ┌────▼───────────────┐
  │Frontend │  │Backend             │
  │ GET API │  │ collector-*.ts     │
  │ → fetch │  │ → DB + defaults    │
  │   목록  │  │   자동 병합        │
  │         │  │ migrate.ts         │
  │ POST API│  │ → cold start 시    │
  │ → 수동  │  │   새 defaults      │
  │   sync  │  │   자동 DB insert   │
  └─────────┘  └────────────────────┘
```

- `default-presets.ts`에 소스/키워드 추가 → 배포만 하면 자동 반영
- 수집기(`collector-rss.ts`, `collector-websearch.ts`): DB 데이터 + defaults 병합
- 마이그레이션(`migrate.ts`): 기존 DB에 없는 새 defaults 자동 insert
- 프론트(`SourcesManager`, `KeywordsManager`): API에서 프리셋 목록 fetch

### 3.3 배포 설정

- **Vercel Cron**: `0 23 * * *` (매일 08:00 KST) → `/api/cron/daily`
- **maxDuration**: 파이프라인 300초, 프리뷰/다운로드 60초
- **인증**: Cron만 `CRON_SECRET` Bearer 토큰 검증

---

## 4. 🔴 보안 취약점 (Critical)

### 4.1 인증/인가 완전 부재

**전체 API 라우트에 인증이 없음.** 누구나 접근 가능.

| 라우트 | 위험 | 공격 시나리오 |
|--------|------|---------------|
| `POST /api/pipeline/run` | **Critical** | 무인증 파이프라인 실행 → Claude API 비용 공격 (1만건 = ~$8,600) |
| `POST /api/setup` | **Critical** | 외부 DB URL+ServiceKey 수락 → DB 하이재킹 가능 |
| `POST /api/pipeline/test` | **High** | 임의 이메일 주소로 뉴스레터 스팸 발송 |
| `POST /api/analysis/run` | **High** | 무인증 AI 분석 → Claude API 비용 |
| `*/api/sources`, `*/api/keywords` | **High** | 무인증 설정 변경 (소스 삭제, 키워드 조작) |
| `*/api/recipients` | **High** | 이메일 리스트 유출, 무단 수신자 추가 |

**권장 조치:**
- 모든 API에 미들웨어 기반 인증 추가 (JWT 또는 Supabase Auth)
- `/api/setup` 즉시 비활성화 또는 `ADMIN_PASSWORD` 환경변수 필수화
- `/api/pipeline/run`에 `CRON_SECRET` 검증 추가 (현재 `/api/cron/daily`만 적용)

### 4.2 Service Role Key 남용

```typescript
// lib/supabase.ts
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
```

- `SUPABASE_SERVICE_ROLE_KEY`는 **RLS(Row Level Security)를 우회**
- 키가 노출되면 모든 테이블의 모든 데이터에 무제한 접근 가능
- **권장**: `SUPABASE_ANON_KEY` + RLS 정책 활성화

### 4.3 Rate Limiting 부재

- Claude API를 호출하는 모든 엔드포인트에 Rate Limit 없음
- `/api/sources/suggest`, `/api/keywords/suggest`, `/api/analysis/run` — 사용자가 무한 호출 가능
- **권장**: 미들웨어 또는 Vercel Edge Config 기반 IP별 Rate Limiting

### 4.4 입력 검증 부재

| API | 문제 |
|-----|------|
| `POST /api/sources` | URL 형식 검증 없음, name 길이 제한 없음 |
| `POST /api/keywords` | 빈 keywords 배열 허용, priority 범위 미검증 |
| `POST /api/recipients` | 이메일 형식 검증 없음 (`not-an-email` 허용) |
| `POST /api/setup` | URL 형식 미검증 (Supabase URL이 아닌 값 허용) |

---

## 5. 🟠 데이터 무결성 문제 (High)

### 5.1 Local Store 경쟁 조건 (Race Condition)

`lib/local-store.ts`는 동기 파일 I/O (read → modify → write)를 사용하며 **파일 잠금이 없음**.

```
Request 1: read [A, B] → push C → write [A, B, C]
Request 2: read [A, B] → push D → write [A, B, D]  ← C 손실!
```

두 요청이 동시에 실행되면 먼저 쓴 데이터가 덮어씌워짐.

- **영향**: 파이프라인 실행 중 기사 손실 가능 (Supabase 미설정 시)
- **권장**: 파일 잠금(`proper-lockfile`) 추가 또는 Supabase 전용으로 전환

### 5.2 에러 무시 패턴

```typescript
if (isSupabaseConfigured()) {
  try { /* DB 쿼리 */ } catch { /* fall through - 무시 */ }
}
```

이 패턴이 **15개 이상의 파일**에서 반복됨. DB 쓰기 실패 시:
- 사용자에게 피드백 없음
- 데이터가 Local Store에만 저장될 수 있음 (영구 손실 위험)
- 부분 성공/실패 상태 추적 불가

**권장**: 에러를 수집하여 파이프라인 결과에 포함, 사용자에게 알림

### 5.3 마이그레이션 한계

```typescript
// migrate.ts
const existingNames = new Set(allSources.map(s => s.name));
const newDefaults = DEFAULT_SOURCES.filter(s => !existingNames.has(s.name));
// 새 defaults만 INSERT — 기존 레코드의 URL 변경은 반영 안됨
```

- **문제**: 소스의 URL이 변경되면 기존 DB 레코드가 업데이트되지 않음
- **예시**: `TechCrunch AI` 피드 URL이 바뀌면 기존 DB에 잘못된 URL 잔존
- **권장**: `name`이 같으면 `url`, `description`, `enabled` 등 UPSERT

---

## 6. 🟡 성능 병목 (Medium)

### 6.1 큐레이터 순차 처리

```typescript
// curator.ts
for (let i = 0; i < batches.length; i++) {
  await callClaude(batches[i]);
  await new Promise(r => setTimeout(r, 1500)); // 배치 간 강제 대기
}
```

- 30건 배치 × 1.5초 딜레이 = 100건 기사 시 **최소 5초 낭비**
- 심층 큐레이션: 10건 배치 × 2초 = 추가 딜레이
- **개선**: Anthropic API Rate Limit에 맞춰 병렬도 조절 (2-3 동시 배치)

### 6.2 이메일 순차 발송

```typescript
// sender.ts
for (const recipient of recipients) {
  await resend.emails.send({ ... }); // 한 건씩 순차
}
```

- 수신자 50명이면 50번 순차 API 호출
- **개선**: `Promise.all()` + 배치 (Resend batch API) 또는 최소 5건씩 병렬

### 6.3 기사 전체 로드 (페이지네이션 없음)

```typescript
// /api/articles/latest
const { data: arts } = await supabase
  .from("articles").select("*")
  .eq("batch_id", run.batch_id)
  .order("relevance_score", { ascending: false });
// 제한 없이 전체 로드
```

- 한 번에 200건 이상 로드 시 응답 크기 증가, 렌더링 지연
- **개선**: 커서 기반 페이지네이션 + 프론트 무한스크롤

### 6.4 PipelineLogs 5초 폴링

```typescript
// PipelineLogs.tsx
useEffect(() => {
  const id = setInterval(fetchLogs, 5000);
  return () => clearInterval(id);
}, []);
```

- 동시 사용자 10명 = 5초마다 10 API 요청
- 로그가 수개월 누적되면 전체 조회 시 느려짐
- **개선**: WebSocket/SSE 또는 마지막 N건만 조회 + 페이지네이션

### 6.5 프론트엔드 가상화 없음

- `NewsTable`: 모든 기사를 한 번에 DOM에 렌더링
- `SourcesManager`: 프리셋 132개 전체 렌더링
- **개선**: `react-window` 또는 `react-virtualized`로 가시 영역만 렌더

---

## 7. 🟢 구조적 개선 포인트

### 7.1 테스트 인프라 부재

- **테스트 커버리지: 0%**
- Jest, Vitest, Playwright 등 **테스트 프레임워크 없음**
- CI/CD 파이프라인 없음 (GitHub Actions 미설정)
- `package.json`에 test 스크립트 없음

**영향**: 큐레이션 프롬프트 변경, 스코어링 로직 수정 시 회귀 확인 불가

**우선 테스트 대상:**
1. `collector.ts` — 중복제거 로직
2. `curator.ts` — JSON 파싱 (`safeParseJSON`)
3. `executive-brief.ts` — 4단계 추출 전략
4. `newsletter-markdown.ts` — MD 렌더링 출력

### 7.2 모니터링/알림 없음

- 모든 로깅: `console.log` / `console.error`만 사용
- 파이프라인 실패 시 **알림 채널 없음** (이메일/Slack)
- 소스별 수집 성공/실패 통계 미추적
- API 응답 시간, 에러율 모니터링 없음

**권장**: Sentry (에러 추적) + Vercel Analytics (성능) 도입

### 7.3 소스 헬스체크 없음

- RSS 피드 URL이 깨져도 감지 불가 (에러 무시됨)
- 어떤 소스에서 몇 건이 수집되는지 통계 없음
- 소스별 마지막 수집 시간 미기록

**권장**: `sources` 테이블에 `last_checked_at`, `last_error`, `article_count` 필드 추가

### 7.4 뉴스레터 예약 발송 불가

- 현재: 파이프라인 실행 즉시 발송 (수집→분석→발송 일괄)
- 미리보기 후 수정/보류 불가
- 발송 시간 지정 불가

**권장**: `draft` 상태 추가 → 미리보기 → 수동 확인 → 발송

### 7.5 다국어 하드코딩

- 모든 UI 텍스트가 한국어 하드코딩 (i18n 미적용)
- 프롬프트도 한국어 고정
- 카테고리/콘텐츠 유형 라벨이 여러 파일에 중복 정의

### 7.6 API 문서 없음

- OpenAPI/Swagger 스펙 없음
- API 라우트별 파라미터, 응답 형식 문서 없음
- 외부 연동 시 소스코드 직접 확인 필요

### 7.7 뉴스레터 렌더링 이중 구조

- `newsletter.ts`: 이메일용 HTML (인라인 스타일, 테이블 레이아웃)
- `newsletter-markdown.ts`: MD 다운로드용
- 두 렌더러가 같은 데이터를 다른 방식으로 표현 → 유지보수 부담
- **향후 고려**: 단일 데이터 구조 → 멀티 포맷 렌더러 패턴

---

## 8. 파일별 상세 분석표

| 파일 | 라인 | 핵심 함수 | 문제점 | 개선안 |
|------|------|-----------|--------|--------|
| `pipeline.ts` | 325 | `runPipeline()` | 순차 처리, dedup O(n²) | 병렬화, 배치 dedup |
| `collector.ts` | 127 | `collectAll()` | 수집기 목록 하드코딩 | 플러그인 패턴 |
| `collector-rss.ts` | ~150 | `collectViaRSS()` | 피드 타임아웃 없음 | 개별 피드 타임아웃 |
| `collector-websearch.ts` | ~200 | `collectViaWebSearch()` | 소스별 에러 무시 | 에러 수집/보고 |
| `curator.ts` | 263 | `curateArticles()`, `deepCurateArticles()` | 배치 간 강제 딜레이, 개별 DB 업데이트 | 병렬 배치, 벌크 업데이트 |
| `prompts.ts` | 343 | 8개 프롬프트 상수 | 프롬프트 버전관리 없음 | 버전 태깅, A/B 테스트 |
| `trend-detector.ts` | 139 | `detectTrends()` | 상위 60건 하드코딩 | 동적 조절 |
| `executive-brief.ts` | 134 | `generateExecutiveBrief()` | 상위 50건 하드코딩, 4단계 파싱 복잡 | 구조화된 출력 |
| `sender.ts` | 82 | `sendNewsletter()` | 순차 발송, 재시도 없음 | 병렬+재시도 |
| `newsletter.ts` | 255 | `renderNewsletter()` | full HTML 문서가 뷰어에서 중첩 | fragment 모드 추가 (수정 완료) |
| `supabase.ts` | ~110 | 타입 정의, 클라이언트 | Service Role Key 기본 사용 | Anon Key + RLS |
| `local-store.ts` | ~100 | `insert()`, `select()` | 경쟁 조건, O(n) 삽입 | 파일 잠금 또는 제거 |
| `migrate.ts` | ~180 | `ensureMigration()` | UPDATE 미지원 | UPSERT 패턴 |
| `default-presets.ts` | ~250 | 소스 132개, 키워드 19그룹 | 검증 없는 URL | URL 헬스체크 |
| `NewsTable.tsx` | 340 | 기사 렌더링 | 페이지네이션 없음 | 무한스크롤 |
| `AIAnalysis.tsx` | ~200 | 브리프 표시 | 태그 파싱 하드코딩 | 공유 파서 |
| `SourcesManager.tsx` | ~400 | 소스 CRUD | 폼 검증 없음 | Zod 스키마 검증 |
| `KeywordsManager.tsx` | ~450 | 키워드 CRUD | 키워드 중복 체크 없음 | Set 기반 중복 방지 |
| `RecipientsManager.tsx` | ~200 | 수신자 CRUD | 이메일 검증 없음 | 정규식 검증 |
| `PipelineLogs.tsx` | ~150 | 로그 표시 | 5초 폴링, 무한 누적 | WebSocket, 페이징 |
| `Toast.tsx` | ~80 | 알림 | ID 오버플로우 가능 | modular counter |

---

## 9. 개선 로드맵

### P0 — 즉시 (보안)

| # | 작업 | 대상 파일 | 예상 소요 |
|---|------|-----------|-----------|
| 1 | 모든 API에 인증 미들웨어 추가 | `middleware.ts` (신규) | 4h |
| 2 | `/api/setup` 비활성화 또는 ADMIN_PASSWORD 필수 | `api/setup/route.ts` | 1h |
| 3 | `/api/pipeline/run`에 CRON_SECRET 검증 | `api/pipeline/run/route.ts` | 30m |
| 4 | Supabase RLS 정책 활성화, Anon Key 전환 | `lib/supabase.ts`, Supabase 대시보드 | 2h |
| 5 | Rate Limiting 미들웨어 (IP 기반) | `middleware.ts` | 2h |

### P1 — 단기 1-2주 (데이터 무결성)

| # | 작업 | 대상 | 예상 소요 |
|---|------|------|-----------|
| 6 | Local Store 파일 잠금 추가 또는 Supabase 전용 전환 | `lib/local-store.ts` | 3h |
| 7 | 이메일/URL 입력 검증 (Zod 스키마) | 모든 API POST 라우트 | 4h |
| 8 | 에러 전파 개선 (silent catch 제거) | 전 파일 | 3h |
| 9 | migrate.ts UPSERT 패턴 도입 | `lib/migrate.ts` | 2h |

### P2 — 중기 1-2개월 (성능/UX)

| # | 작업 | 대상 | 예상 소요 |
|---|------|------|-----------|
| 10 | 기사 커서 기반 페이지네이션 | API + NewsTable | 6h |
| 11 | 큐레이터 병렬 배치 처리 | `lib/curator.ts` | 4h |
| 12 | 이메일 병렬 발송 (Promise.all 배치) | `lib/sender.ts` | 2h |
| 13 | PipelineLogs WebSocket/SSE 전환 | API + Component | 4h |
| 14 | React.memo + 가상 리스트 | Components | 3h |
| 15 | 소스 헬스체크 대시보드 | 신규 컴포넌트 + API | 6h |

### P3 — 장기 분기 단위 (품질/확장)

| # | 작업 | 예상 소요 |
|---|------|-----------|
| 16 | 테스트 프레임워크 도입 (Vitest) + 핵심 모듈 테스트 | 2d |
| 17 | CI/CD (GitHub Actions: lint → test → build → deploy) | 4h |
| 18 | Sentry 에러 추적 + Vercel Analytics | 3h |
| 19 | 뉴스레터 예약 발송 (draft → review → schedule) | 1d |
| 20 | 프롬프트 버전관리 + A/B 테스트 프레임워크 | 1d |
| 21 | API 문서 (OpenAPI/Swagger 자동 생성) | 4h |
| 22 | i18n 다국어 지원 | 2d |

---

## 10. 결론

ACRYL Intelligence Brief는 **AI 기반 뉴스 큐레이션의 핵심 파이프라인이 잘 설계된** 시스템이다. 6개 수집기 병렬 실행, Claude API 기반 스코어링/심층분석, 자동 트렌드 탐지 등 핵심 기능이 완성되어 있다.

그러나 **프로덕션 운영에는 아직 부적합**하다:
- **보안**: 전 API 인증 부재 → 즉각 조치 필요
- **안정성**: Local Store 경쟁 조건, 에러 무시 패턴 → 데이터 손실 위험
- **확장성**: 페이지네이션 없음, 순차 처리 → 기사 수 증가 시 성능 저하
- **운영**: 테스트 0%, 모니터링 없음 → 장애 감지/대응 불가

**최우선 과제**: P0(보안) 5개 항목을 즉시 해결한 후, P1(데이터 무결성) 순으로 진행할 것을 권장한다.
