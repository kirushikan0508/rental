export const emailTemplates = {
  BOOKING_CONFIRMED: (userName: string, bookingId: string) => `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #4CAF50;">Booking Confirmed!</h2>
        <p>Hi ${userName},</p>
        <p>Exciting news! Your vehicle rental for booking <strong>#${bookingId}</strong> has been confirmed.</p>
        <p>You can track your vehicle 1 hour before pickup in the app.</p>
        <br/>
        <p>Safe travels,<br/>The Rental Marketplace Team</p>
      </body>
    </html>
  `,
  REMINDER_1HOUR: (vehicleName: string) => `
    <html>
      <body>
        <h2>Trip Reminder</h2>
        <p>Your rental of <strong>${vehicleName}</strong> starts in 1 hour!</p>
        <p>Open the app to see the live location of your vehicle.</p>
      </body>
    </html>
  `,
  EMERGENCY_SOS: (userName: string, location: string) => `
    <html>
      <body style="background-color: #ffefef; padding: 20px;">
        <h2 style="color: #ff0000; text-transform: uppercase;">âš ï¸  Emergency SOS Alert âš ï¸ </h2>
        <p>An SOS alert was triggered by <strong>${userName}</strong>.</p>
        <p><strong>Last Known Location:</strong> ${location}</p>
        <p>Please take immediate action.</p>
      </body>
    </html>
  `
};
