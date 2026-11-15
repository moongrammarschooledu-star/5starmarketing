"use client";

import { useState } from "react";
import { CheckCircle2, Send, Smartphone } from "lucide-react";
import { smsUrlFor, whatsappUrlFor } from "@/lib/site";
import { DEMAND_CONFIRM_TEXT } from "@/lib/shareDetails";
import { logDemandConfirmSentAction } from "@/lib/actions/demands.actions";

/** Sends the client everything that was saved for their demand, plus the
 *  company's details, so they can check it and spot any mistake. WhatsApp
 *  opens with the message already written; the team presses send inside it. */
export function DemandConfirmSend({
  demandId,
  clientName,
  number,
  detailLines,
  justSaved,
}: {
  demandId: string;
  clientName: string;
  number: string;
  detailLines: string[];
  /** Shown right after the demand was saved: a highlighted card that asks the team to confirm it with the client. */
  justSaved: boolean;
}) {
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const message = [`Assalam-o-Alaikum ${clientName},`, "", DEMAND_CONFIRM_TEXT, "", ...detailLines].join("\n");

  function done(channel: "whatsapp" | "sms") {
    setSent((s) => ({ ...s, [channel]: true }));
    void logDemandConfirmSentAction(demandId, channel);
  }

  return (
    <div className={`rounded-2xl border p-5 ${justSaved ? "border-success/40 bg-success/5" : "border-border bg-surface"}`}>
      <h2 className="font-heading text-base font-bold text-ink">{justSaved ? "Saved. Now confirm it with the client" : "Send these details to the client"}</h2>
      <p className="mt-1 text-xs text-muted">
        The client gets every saved detail and our company details, so they can check that nothing is wrong. Sending it to {clientName} on {number}.
      </p>
      <pre className="mt-3 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[#dcf8c6] p-3 font-sans text-xs text-[#111]">{message}</pre>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={whatsappUrlFor(number, message)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => done("whatsapp")}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold ${sent.whatsapp ? "border border-success/40 text-success" : "bg-success text-white hover:opacity-90"}`}
        >
          {sent.whatsapp ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />} {sent.whatsapp ? "Opened - send again" : "Send on WhatsApp"}
        </a>
        <a
          href={smsUrlFor(number, message)}
          onClick={() => done("sms")}
          title="Opens the SMS app on a phone"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary"
        >
          {sent.sms ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Smartphone className="h-3.5 w-3.5" />} SMS
        </a>
      </div>
    </div>
  );
}
