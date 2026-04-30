import type { BidRejectReason } from "../../../shared/socketEvents.js";

export class BidError extends Error {
  public readonly reason: BidRejectReason;

  constructor(reason: BidRejectReason) {
    super(reason);
    this.name = "BidError";
    this.reason = reason;
  }
}
