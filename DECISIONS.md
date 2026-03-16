# DECISIONS

## Scope

### What I Implemented

**Core feature: Compliance Gap Summary**

- basically a full end-to-end summary generation flow
- Structured data processing with per-chapter grouping and global rollups
- added an AI-generated executive summary using Gemini 2.5 Flash (optional, gracefully degrades)
- added dedicated `/summary` page with:
  - Executive summary (AI prose)
  - Top-level stat cards (score, risk, counts)
  - Per-chapter breakdown
  - Gaps requiring action (FAIL + MISSING items)
  - Not Applicable section (N/A items with exclusion reasoning)
- Navigation integration (sidebar link and stuff )

**Technical decisions:**

- Pure function `summarize()` in `server/utils/` for testability
- Separate types file (`shared/types/summary.ts`) as contract between server/client
- Thin API handler that delegates to utility functions
- Semantic UI tokens (no custom colors) for visual consistency
- All configuration externalized (no hardcoded API keys, model names, or magic numbers)

### What I Intentionally Did Not Implement

**Out of scope for 2-hour timebox:**

- Filtering/sorting UI (e.g., "show only FAIL", "sort by clause number")
- Drill-down from chapter cards to that chapter's gaps
- Export functionality (PDF, CSV, etc.)
- Historical trend analysis (requires persistence layer)
- Action assignment workflow ("assign gap X to owner Y")
- Severity scoring beyond risk level (e.g., "critical vs minor MISSING")
- Real-time evaluation updates (SSE/WebSocket) etc
- Unit tests (prioritized working implementation over test coverage)

---

## Key Tradeoffs

### 1. **N/A Clauses Excluded from Compliance Score**

**Decision:** `total = PASS + FAIL + MISSING` (N/A excluded)

**Why:** N/A in this case means "this clause doesn't apply to our product" — that is it's neither a compliance achievement nor a gap. Including it would inflate the score artificially so its kinda not neeeded i asssume. For example, if 10 clauses are N/A and 1 is PASS, the score would be 100% despite only evaluating one requirement.

**Tradeoff:** This makes the score represent "compliance among evaluated clauses" rather than "coverage of the full standard." A low score with many N/A items is very different from a low score with no N/A items. We mitigate this by showing N/A count prominently in the UI.

### 2. **Risk Level Derived from Status Counts, Not Prose**

**Decision:** `HIGH` if any FAIL, `MEDIUM` if any MISSING (no FAILs), `LOW` otherwise.

**Why:** This is deterministic, auditable, and doesn't require subjective interpretation. FAIL is objectively worse than MISSING because FAIL means we _evaluated and failed_, while MISSING means we couldn't prove compliance (evidence gap, not confirmed failure).

**Tradeoff:** Doesn't account for severity — one FAIL in a trivial clause gets the same HIGH risk as a FAIL in a safety-critical clause. With more time, I'd add clause-level severity metadata and weight the risk calculation.

### 3. **AI Summary Uses Gemini 2.5 Flash (Not Embedded in Summarize Logic)**

**Decision:** AI call happens _after_ structured summary is computed, in a separate utility. If the API key is missing or the call fails, the feature gracefully degrades (summary is null, UI hides the card).

**Why:**

- **Separation of concerns:** The core summarization logic (`summarize()`) stays pure and testable without mocking API calls.
- **Latency management:** AI call is the slowest part — keeping it separate means we could parallelize or cache it later.
- **No vendor lock-in:** Swapping Gemini for OpenAI/Claude only requires changing `server/utils/gemini.ts`.

**Tradeoff:** Adds ~1-2 seconds of latency to the `/api/summary` endpoint. In production, I'd add caching (e.g., "if the evaluation dataset hasn't changed, reuse the last summary").

### 4. **Chapter Grouping (Not Flat List)**

**Decision:** Group gaps by chapter in both the data structure and UI.

**Why:** The dataset has `index_chapter` and chapter titles — this structure already exists. Chapter-level grouping helps reviewers triage ("Chapter 14 has 7 gaps, Chapter 16 has 1 — prioritize 14"). It mirrors how compliance auditors actually work.

**Tradeoff:** Adds complexity to the data structure. A flat list would be simpler to render, but less useful. The chapter cards provide context that a flat list loses.

### 5. **No Filtering/Search UI**

**Decision:** Show all gaps and N/A items without client-side filtering.

**Why:** With 31 records in the dataset (15 gaps, 3 N/A), the page is still scannable. Adding filters would take 30+ minutes (UI controls, state management, URL sync) — beyond the 2-hour budget.

**Tradeoff:** Won't scale to 300+ clause evaluations. In production, I'd add:

- Search by clause number or keyword
- Filter by status (show only FAIL, only MISSING)
- Chapter-based filtering (show only Chapter 14 gaps)

---

## Summary Logic

### How the Summary is Produced

**Data flow:**

1. **Separate TITLE rows from JUDGE rows** — TITLE rows are chapter headers with no status, JUDGE rows are actual evaluations.
2. **Build chapter title lookup** — Map `index_chapter` chapter name from TITLE rows.
3. **Group JUDGE rows by chapter** — Accumulate counts and collect gaps per chapter.
4. **Roll up global counts** — Sum all per-chapter counts into global totals.
5. **Derive score and risk** — Score = `PASS / total * 100`, risk from cascading rules.
6. **Flatten gaps** — Combine all per-chapter gaps into a single ordered list.
7. **Generate AI summary** — Call Gemini API with structured prompt (optional, can fail gracefully).

**Key formulas:**

- **Compliance Score:** `Math.round((PASS / (PASS + FAIL + MISSING)) * 1000) / 10` → one decimal place
- **Risk Level:**
  ```
  if (FAIL > 0) → HIGH
  else if (MISSING > 0) → MEDIUM
  else → LOW
  ```

### How Ambiguity and Weak Evidence are Handled

**MISSING vs N/A distinction:**

- **MISSING** = "We looked but couldn't find evidence" (e.g., "no explicit declaration of conformity to IEC 60072")
- **N/A** = "This clause doesn't apply" (e.g., "no mechanical brake exists, so brake protection clause is N/A")

The justification field kinda makes this clear. MISSING items are gaps that need action; N/A items are documented exclusions.

**Empty status (`""`) on TITLE rows:**
TITLE rows have `job_type === 'TITLE'` and empty status. We skip them entirely during counts — they're structural metadata, not evaluations.

**Conditional applicability (`applicable_if` field):**
Some clauses have conditions like "IF controllers do not switch off the supply." We show this in the UI as a badge so reviewers can assess if the condition applies to their product. We don't auto-evaluate it — that requires domain knowledge.

---

## Validation

### What I Tested

**Manual testing:**

- `/api/summary` endpoint returns valid JSON matching `ComplianceSummary` type
- Counts match the dataset (10 PASS, 1 FAIL, 14 MISSING, 3 N/A, total=25)
- Compliance score calculates correctly (10/25 \* 100 = 40%)
- Risk level is HIGH (due to 1 FAIL)
- Executive summary generates when API key is present
- Executive summary gracefully degrades when API key is missing (null, UI hides card)
- TypeScript compilation clean (zero errors)
- UI renders on both `/` (raw table) and `/summary` (gap summary)

**Edge cases considered:**

- No evaluable items (`total = 0`) → score returns 100% (nothing to fail)
- API call fails → executive summary is null, page still works
- Missing justification text → UI handles null values gracefully

### What Remains Untested

**No automated tests:**

- Unit tests for `summarize()` (e.g., "given fixture A, output should match snapshot B")
- Integration tests for `/api/summary` endpoint
- Visual regression tests for UI

**Not tested with real variance:**

- Dataset with 0 gaps (all PASS) → risk should be LOW, score 100%
- Dataset with multiple chapters (only have 2 in fixture)
- Very long justification text (could overflow UI)
- Non-Latin characters in clause titles

**Performance not benchmarked:**

- Gemini API call latency (observed ~1-2s in dev, not measured)
- Summary computation with 1000+ clauses (current dataset is 31)

---

## If I Had More Time

### Next Improvements (Ordered by Impact)

1. **Add unit tests for `summarize()`**

2. **Cache AI summaries**

3. **Add severity scoring to clauses**

4. **Filtering and search UI**

5. **Export functionality**

6. **Action assignment workflow**

7. **Historical trend tracking**

---

## Architecture Notes

**Why a separate `/api/summary` endpoint instead of extending `/api/evaluation`?**

- **Single Responsibility:** `/api/evaluation` returns raw data, `/api/summary` returns processed insights. Different use cases.
- **Caching strategy:** Raw data changes rarely; summary can be cached aggressively.
- **Client control:** Clients can fetch raw data for custom processing, or fetch pre-computed summary.

**Why not use a database?**

- Assignment specifies static fixture data. Adding a DB would be over-engineering for the 2-hour scope.
- If this were production, I'd use PostgreSQL with a `jsonb` column for evaluation results + metadata table for standards/evaluations.

**Why Gemini 2.5 Flash over GPT-4?**

- Free tier available (no billing setup needed for demo)
- Fast (~1-2s latency vs 3-5s for GPT-4)
- "Flash" variant optimized for short-form summarization tasks
- Easy to swap (abstracted behind `generateExecutiveSummary()` function)

---

## Security & Production Readiness

**What would need to change for production:**

1. **API key management:**
   - Move to secret manager (AWS Secrets Manager, Google Secret Manager)
   - Rotate keys regularly
   - Never commit `.env` to git (already gitignored, but enforce in CI)

2. **Error handling:**
   - Add retry logic for Gemini API (transient failures)
   - Return structured error responses from `/api/summary` (not just 500)
   - Add monitoring/alerting for AI call failures

3. **Input validation:**
   - Validate `EvaluationDataset` structure before processing
   - Sanitize user input if evaluations become editable

4. **Rate limiting:**
   - Limit Gemini API calls (avoid runaway costs)
   - Cache summaries aggressively (described above)

5. **Accessibility:**
   - Add ARIA labels to stat cards
   - Ensure keyboard navigation works
   - Test with screen readers

6. **Performance:**
   - Server-side render the summary page (SSR) for faster initial load
   - Lazy-load N/A section (only render when expanded)
   - Virtualize gap list if 100+ items
