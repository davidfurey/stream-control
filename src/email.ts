export function send(
  from: string,
  to: string,
  subject: string,
  message: string): Promise<void> {
  console.error("Sending error email")
  console.error(`From: ${from}`)
  console.error(`To: ${to}`)
  console.error(`Subject: ${subject}`)
  console.error(`${message}`)
  return Promise.resolve()
}