import { NextRequest, NextResponse } from 'next/server';

// Note: In a real environment, you would use a package like 'resend'
// but for this example, we simulate the fetch call to the Resend API.

// Define the expected structure for the POST request body
interface SendEmailRequest {
  to: string;
  subject: string;
  bodyHtml: string;
  attachmentData?: string; // Base64 encoded file data
  attachmentFilename?: string; // Filename for the attachment
}

/**
 * Handles POST requests to send an email via Resend.
 * Assumes RESEND_API_KEY is set in the environment variables.
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { 
      to, 
      subject, 
      bodyHtml, 
      attachmentData, 
      attachmentFilename 
    }: SendEmailRequest = await req.json();

    if (!to || !subject || !bodyHtml) {
      return NextResponse.json({ error: 'Missing required email fields (to, subject, bodyHtml)' }, { status: 400 });
    }

    const attachments = attachmentData && attachmentFilename
      ? [{
          // Resend requires file data to be a Base64 encoded string
          content: attachmentData,
          filename: attachmentFilename,
        }]
      : [];

    const resendPayload = {
      from: 'Prepaid Manager <onboarding@resend.dev>', // Sender email as requested
      to: [to],
      subject: subject,
      html: bodyHtml,
      attachments: attachments,
    };

    // Simulate Resend API Call
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(resendPayload),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('Resend API Error:', errorData);
      return NextResponse.json({ 
        error: 'Failed to send email via Resend', 
        details: errorData 
      }, { status: 500 });
    }

    const successData = await resendResponse.json();
    return NextResponse.json({ message: 'Email sent successfully', data: successData });

  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json({ error: 'Internal server error during email processing' }, { status: 500 });
  }
}