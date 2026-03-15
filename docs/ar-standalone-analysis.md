# AgentReferrals: Standalone vs Embedded in AgentDashboards

**Date:** March 15, 2026
**Decision:** Keep standalone, deeply integrated with hub

---

## The Question

Should AgentReferrals live as a tab inside AgentDashboards, or remain a separate product?

## Case FOR Embedding

1. **Agents already in AD** — 32K+ transactions, 423K participants, real agent profiles. No cold-start.
2. **Data is the moat** — ReferNet Score calculated from actual closed transactions, not self-reported.
3. **Cross-product value** — referral closes → shows in AD revenue, CO transactions, network tree automatically.
4. **One login, one sub** — agents won't pay for 6 products, but $149/mo for AD with referrals included is compelling.
5. **NORA already built** — hub NORA has all data, "find me a referral partner" is just another tool call.

## Case AGAINST Embedding

1. **Different user base** — AD = your brokerage's agents. AR = any agent at any brokerage. KW agents won't sign up for "AgentDashboards."
2. **Brand positioning** — AD = internal BI tool. AR = industry marketplace. Different go-to-market.
3. **Trust problem** — competing brokerages see AR inside AD as "Real Broker's tool" and won't trust it.
4. **Revenue conflict** — AD = brokerage subscription. AR = per-agent, per-market pricing. These models fight.
5. **Growth ceiling** — AD TAM = agents at onboarded brokerages. AR TAM = 1.5M licensed agents in US.

## Decision: Standalone, Hub-Integrated

AR is its own product with its own brand, but reads from the hub to give AD agents an unfair advantage:

### AD Agent signs up for AR:
- Profile auto-populated from hub (no onboarding needed)
- Transaction history verifies production claims
- ReferNet Score calculated from REAL data
- "Verified by AgentDashboards" badge (unique credibility)
- NORA already knows them

### Non-AD Agent signs up for AR:
- Manual profile setup
- Self-reported stats (unverified)
- No "Verified" badge until they connect a data source
- Starts from zero

### Why This Works

- AD agents get an **unfair advantage** on AR → makes AD more valuable
- AR has **verified agents** from AD → makes AR more trustworthy
- They feed each other without being the same product
- AR can grow to 1.5M agents without being limited by AD's brokerage-by-brokerage model

### Architecture

```
DATA HUB
  ├── profiles, agents, transactions (shared)
  ├── NORA (shared AI)
  │
  ├── AgentDashboards (reads hub, own DB)
  │     └── "Your referral network" link → opens AR
  │
  └── AgentReferrals (reads hub, own DB)
        └── "Verified by AD" badge for hub agents
```

**Bottom line:** Keep them separate products, same hub. AR is the bigger TAM opportunity — don't limit it by embedding it in a brokerage-specific tool. But make AD the best way to get verified on AR.
