import { NextResponse } from "next/server";

export const runtime = "nodejs";

const recipient = "level10@hotmail.de";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  if (typeof data.website === "string" && data.website.trim()) {
    return NextResponse.json({ success: true });
  }

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const phone = typeof data.phone === "string" ? data.phone.trim() : "";
  const consent = data.consent === "true" || data.consent === true;

  if (name.length < 2 || name.length > 100) {
    return NextResponse.json({ error: "Bitte geben Sie Ihren Namen ein." }, { status: 400 });
  }
  if (phone.length < 5 || phone.length > 30 || !/^[+\d()\s./-]+$/.test(phone)) {
    return NextResponse.json({ error: "Bitte geben Sie eine gültige Telefonnummer ein." }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ error: "Bitte stimmen Sie der Kontaktaufnahme zu." }, { status: 400 });
  }

  const apiKey = process.env.MJ_APIKEY_PUBLIC;
  const secretKey = process.env.MJ_APIKEY_PRIVATE;
  const senderEmail = process.env.CALLBACK_FROM_EMAIL;
  const senderName = process.env.CALLBACK_FROM_NAME || "SchadenFuchs";
  if (!apiKey || !secretKey || !senderEmail) {
    console.error("Callback email configuration is missing.");
    return NextResponse.json(
      { error: "Der E-Mail-Versand ist momentan nicht eingerichtet. Bitte rufen Sie uns direkt an." },
      { status: 503 }
    );
  }

  const submittedAt = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin"
  }).format(new Date());

  try {
    const emailResponse = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:${secretKey}`).toString("base64")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: senderEmail, Name: senderName },
            To: [{ Email: recipient }],
            Subject: "Neue Rückrufanfrage – SchadenFuchs",
            TextPart: [
              "Eine neue Rückrufanfrage ist eingegangen.",
              "",
              `Name: ${name}`,
              `Telefon: ${phone}`,
              "Einwilligung zur Kontaktaufnahme: Ja",
              `Eingegangen: ${submittedAt}`
            ].join("\n")
          }
        ]
      })
    });

    const result = await emailResponse.json().catch(() => null);
    const mailjetMessage = result?.Messages?.[0];
    const messageStatus = mailjetMessage?.Status;
    if (!emailResponse.ok || messageStatus !== "success") {
      console.error("Callback email provider returned status", emailResponse.status);
      return NextResponse.json(
        { error: "Der E-Mail-Versand ist fehlgeschlagen. Bitte rufen Sie uns direkt an." },
        { status: 502 }
      );
    }

    console.info("Callback email accepted by Mailjet", {
      messageId: mailjetMessage.To?.[0]?.MessageID,
      status: messageStatus
    });
    return NextResponse.json({ success: true });
  } catch {
    console.error("Callback email provider could not be reached.");
    return NextResponse.json(
      { error: "Der E-Mail-Versand ist fehlgeschlagen. Bitte rufen Sie uns direkt an." },
      { status: 502 }
    );
  }
}
