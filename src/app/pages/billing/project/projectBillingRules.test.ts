// @vitest-environment node
import { describe, test, expect } from "vitest";
import { allocateAcrossStages, allocatePayment, amountPerPercentOf, paymentDetailsFor, proformaApprovalOf, stepsOf, METHOD_DETAILS, type BillableStage } from "./projectBillingRules";
type LiveBill = Parameters<typeof stepsOf>[0];

describe("a bill with no proforma", () => {
    const bill = (over: Record<string, unknown>) =>
        ({ status: "PROFORMA", proformaDocumentId: null, invoiceDocumentId: null, outstandingAmount: 100, ...over }) as unknown as LiveBill;

    test("a draft bill, or one in progress that lost its proforma, is ready for one", () => {
        expect(stepsOf(bill({ status: "DRAFT" })).proforma).toBe(true);
        expect(stepsOf(bill({ status: "PROFORMA" })).proforma).toBe(true);
        expect(stepsOf(bill({ status: "PARTIALLY_PAID" })).proforma).toBe(true);
    });
    test("a bill that has a proforma, or a tax invoice, does not ask for another", () => {
        expect(stepsOf(bill({ proformaDocumentId: "d1" })).proforma).toBe(false);
        expect(stepsOf(bill({ invoiceDocumentId: "i1" })).proforma).toBe(false);
    });
    test("a settled bill with no documents (imported history) is left alone", () => {
        expect(stepsOf(bill({ status: "PAID" })).proforma).toBe(false);
        expect(stepsOf(bill({ status: "INVOICED" })).proforma).toBe(false);
    });
});

describe("a proforma revised after it was issued", () => {
    const revising = (over: Record<string, unknown> = {}) =>
        ({
            status: "AWAITING_PAYMENT", proformaDocumentId: "p1", proformaStatus: "DRAFT",
            invoiceDocumentId: null, invoiceStatus: null, outstandingAmount: 100, receivedAmount: 0, ...over,
        }) as unknown as LiveBill;
    test("offers only Edit proforma: no payment, no tax invoice", () => {
        const steps = stepsOf(revising());
        expect(steps.proforma).toBe(true);
        expect(steps.revisingProforma).toBe(true);
        expect(steps.pay).toBe(false);
        expect(steps.raiseBill).toBe(false);
    });
    test("holds even when money was already received against it", () => {
        const steps = stepsOf(revising({ status: "PARTIALLY_PAID", receivedAmount: 40, outstandingAmount: 60 }));
        expect(steps.pay).toBe(false);
        expect(steps.raiseBill).toBe(false);
    });
    test("once the revision is published, payment and billing come back", () => {
        const steps = stepsOf(revising({ proformaStatus: "SENT" }));
        expect(steps.revisingProforma).toBe(false);
        expect(steps.pay).toBe(true);
        expect(steps.raiseBill).toBe(true);
    });
});

describe("paymentDetailsFor", () => {
    test("cash records no reference and no bank, even if typed before switching to cash", () => {
        expect(paymentDetailsFor("CASH", "UTR1", "HDFC")).toEqual({ reference: null, bankName: null });
    });
    test("a cheque keeps its number and bank; a bank transfer keeps UTR and bank", () => {
        expect(paymentDetailsFor("CHEQUE", " 0045 ", "HDFC")).toEqual({ reference: "0045", bankName: "HDFC" });
        expect(paymentDetailsFor("NEFT", "UTR1", "")).toEqual({ reference: "UTR1", bankName: null });
    });
    test("UPI keeps the transaction id but drops the bank", () => {
        expect(paymentDetailsFor("UPI", "T1", "HDFC")).toEqual({ reference: "T1", bankName: null });
    });
    test("every method is described", () => {
        expect(Object.keys(METHOD_DETAILS)).toHaveLength(9);
    });
});

// A ₹10,00,000 contract: Advance 30%, Design 20%, Tender 20%.
const stage = (stageId: string, share: number, left = share * 10000): BillableStage =>
    ({ stageId, stageName: stageId, left, stageAmount: share * 10000, stageShare: share });
const STAGES = [stage("advance", 30), stage("design", 20), stage("tender", 20)];

describe("allocateAcrossStages", () => {
    test("35% from Advance is all of Advance and 5% of the next stage", () => {
        const perPercent = amountPerPercentOf(STAGES);
        expect(allocateAcrossStages(STAGES, "advance", 35 * perPercent)).toEqual({ advance: 300000, design: 50000 });
    });

    test("starts at the chosen stage and wraps round to the earlier ones", () => {
        expect(allocateAcrossStages(STAGES, "design", 450000)).toEqual({ design: 200000, tender: 200000, advance: 50000 });
    });

    test("ticking a later stage skips the earlier ones: 30% from Design Concept leaves Advance alone", () => {
        expect(allocateAcrossStages(STAGES, "advance", 300000, ["design"])).toEqual({ design: 200000, tender: 100000 });
    });

    test("ticked stages fill first even when they are not next to each other", () => {
        expect(allocateAcrossStages(STAGES, "advance", 350000, ["advance", "tender"])).toEqual({ advance: 300000, tender: 50000 });
    });

    test("takes only what is left on a stage already billed in part", () => {
        const stages = [stage("advance", 30, 100000), stage("design", 20)];
        expect(allocateAcrossStages(stages, "advance", 150000)).toEqual({ advance: 100000, design: 50000 });
    });

    test("never allocates more than every stage has left", () => {
        const out = allocateAcrossStages(STAGES, "advance", 9999999);
        expect(Object.values(out).reduce((a, b) => a + b, 0)).toBe(700000);
    });
});

describe("allocatePayment", () => {
    test("fills the oldest bill's Bill Amount, then its GST, then the next bill", () => {
        const bills = [
            { id: "b1", basicPending: 1000, gstPending: 180 },
            { id: "b2", basicPending: 500, gstPending: 90 },
        ];
        expect(allocatePayment(bills, 1500)).toEqual({ b1: { basic: 1000, gst: 180 }, b2: { basic: 320, gst: 0 } });
    });

    test("skips bills with nothing pending", () => {
        expect(allocatePayment([{ id: "b1", basicPending: 0, gstPending: 0 }, { id: "b2", basicPending: 100, gstPending: 0 }], 50))
            .toEqual({ b2: { basic: 50, gst: 0 } });
    });
});

describe("the proforma approval check", () => {
    const of = (proformaVersionStatus: string | null, proformaVersionId: string | null = "v1") =>
        proformaApprovalOf({ proformaVersionId, proformaVersionStatus } as Parameters<typeof proformaApprovalOf>[0]);

    test("an issued proforma the client has not answered asks first", () => {
        expect(of("GENERATED")).toBe("PENDING");
        expect(of("SENT")).toBe("PENDING");
        expect(of("VIEWED")).toBe("PENDING");
    });
    test("an accepted proforma goes ahead; a rejected one stops", () => {
        expect(of("CLIENT_ACCEPTED")).toBe("APPROVED");
        expect(of("CLIENT_REJECTED")).toBe("REJECTED");
    });
    test("a bill with no proforma (imported history) is never held up", () => {
        expect(of(null, null)).toBe("APPROVED");
    });
});
