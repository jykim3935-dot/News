# 뉴스 클리핑 에이전트

네이버 뉴스를 수집해 Claude로 요약·분류한 뒤, Notion **"일일 뉴스클리핑"** 데이터베이스에 자동 저장하는 가벼운 에이전트입니다.

```
네이버 뉴스 검색 API  →  Claude 분석(요약·시사점·중요도·분류)  →  Notion 저장(중복 제거)
```

## 구성

| 파일 | 역할 |
|------|------|
| `config.ts` | 수집 키워드, Notion 옵션 매핑, 모델 등 모든 설정 |
| `naver.ts` | 네이버 뉴스 검색 API 수집 + URL 중복 제거 |
| `analyze.ts` | Claude로 관련성 판단·핵심요약·시사점·중요도·카테고리·언급기업 추출 |
| `notion.ts` | Notion DB에 기록 (원문 URL 기준 중복 방지) |
| `run.ts` | 전체 파이프라인 실행 진입점 |

## 수집 키워드

`config.ts`의 `KEYWORDS`에서 관리합니다. 현재 설정:

- **산업/기술**: 반도체, 생성형 AI, AI 스타트업 투자
- **관심 기업**: 노타, 래블업, 마키나락스, 베슬AI, 업스테이지, 사이오닉AI

기업 키워드는 매칭 시 Notion `언급기업` 속성에 자동 태깅됩니다.

## 환경변수 (`.env`)

```bash
ANTHROPIC_API_KEY=     # Claude API 키
NAVER_CLIENT_ID=       # 네이버 개발자센터 검색 API
NAVER_CLIENT_SECRET=
NOTION_API_KEY=        # Notion 내부 통합(integration) 토큰 (secret_...)
NOTION_DATABASE_ID=    # 선택. 기본값은 "일일 뉴스클리핑" DB
```

### 발급 방법

1. **네이버 검색 API**: <https://developers.naver.com/apps> → 애플리케이션 등록 → "검색" API 추가 → Client ID/Secret 발급.
2. **Notion 통합 토큰**: <https://www.notion.so/my-integrations> → "New integration" 생성 → Internal Integration Secret 복사. 그 다음 **"일일 뉴스클리핑" 페이지 우상단 ⋯ → 연결(Connections) → 방금 만든 통합을 추가**해야 에이전트가 DB에 쓸 수 있습니다.
3. **Anthropic 키**: <https://console.anthropic.com/>.

## 실행

```bash
npm install
npm run clip
```

매일 자동 실행하려면 cron / GitHub Actions에 `npm run clip`을 등록하면 됩니다. 예) GitHub Actions:

```yaml
# .github/workflows/clip.yml
on:
  schedule:
    - cron: "0 23 * * *"   # 매일 08:00 KST
jobs:
  clip:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run clip
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          NAVER_CLIENT_ID: ${{ secrets.NAVER_CLIENT_ID }}
          NAVER_CLIENT_SECRET: ${{ secrets.NAVER_CLIENT_SECRET }}
          NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
```

## Notion 저장 항목

| 속성 | 내용 |
|------|------|
| 제목 | 기사 제목 |
| 원문 | 기사 URL (중복 판단 기준) |
| 매체 | 도메인 기반 언론사 추정 (없으면 기타) |
| 핵심요약 | 2~3문장 요약 |
| 시사점 | 산업 관점 함의 |
| 중요도 | ★★★ / ★★☆ / ★☆☆ |
| 카테고리 | 자사·경쟁사·효율화기술·정책규제·논문/오픈소스·기타산업 |
| 언급기업 | 기사에 언급된 관심 기업 |
| 일자 | 발행일 |

## 커스터마이징

- 키워드 추가/변경: `config.ts`의 `KEYWORDS`
- 수집량/기간: `ARTICLES_PER_KEYWORD`, `MAX_AGE_DAYS`
- 분석 기준(요약 톤, 중요도 판정 등): `analyze.ts`의 `SYSTEM_PROMPT`
