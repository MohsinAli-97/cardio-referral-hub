# Pricing Page Audit

## Status: Working correctly
- All 16 tests displayed with correct fees from brochure
- 9 insurance providers shown (Healix, AXA PPP, Allianz, Cigna, WPA, BUPA, Vitality, Aviva, Self-Pay)
- Patient Cost column visible
- Summary cards: 9 providers, 16 tests, £168 avg fee, £400 highest, £548 avg patient cost
- Add Insurer / Add Test buttons present
- Reset Defaults button present
- Inline editing works (click to edit)
- Search field works
- All scrollable horizontally for all columns

## Issues noticed:
- The table scrolls horizontally but the Aviva, Self-Pay, Patient Cost columns are cut off in the viewport
- Need to scroll right to see them - this is expected behavior for wide tables
- The "Self-Pay" column in the fee schedule is the reporting fee for self-pay patients
- The "Patient Cost" column is the actual cost charged to the patient

## Integration with other pages:
- Dashboard, Reports, Invoices, InsuranceAnalysis all now use PricingContext overrides
- Changes to pricing will immediately reflect across all pages
