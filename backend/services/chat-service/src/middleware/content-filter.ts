import { Request, Response, NextFunction } from 'express';

// Regex Patterns
const PHONE_PATTERN = /(\+?\d{1,4}[\s-]?)?(\(?\d{3}\)?[\s-]?)?[\d\s-]{7,15}/;
const EMAIL_PATTERN = /([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})/;
const LINK_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9\-\.]+\.(com|org|net|io|me|co))/i;

export const ContentFilterMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { content } = req.body;
  
  if (!content) {
    return next();
  }

  // Check for violations
  const hasPhone = PHONE_PATTERN.test(content);
  const hasEmail = EMAIL_PATTERN.test(content);
  const hasLink = LINK_PATTERN.test(content);

  // If a violation exists, we can either block the request entirely or alter exactly what happens
  if (hasPhone || hasEmail || hasLink) {
    // We could return a 400 Bad Request if it's via REST 
    // And handle the repeated block pattern externally via moderation service mapping
    res.status(403).json({
      success: false,
      error: 'Message contains blocked content. Please refrain from sharing phone numbers, emails, or external links.',
      flags: {
        phone: hasPhone,
        email: hasEmail,
        link: hasLink
      }
    });
    return;
  }

  next();
};

/**
 * Reusable utility function to check raw string context directly inside Socket.io handlers
 */
export const checkContentViolations = (content: string) => {
  return {
    hasPhone: PHONE_PATTERN.test(content),
    hasEmail: EMAIL_PATTERN.test(content),
    hasLink: LINK_PATTERN.test(content),
    isClean: !PHONE_PATTERN.test(content) && !EMAIL_PATTERN.test(content) && !LINK_PATTERN.test(content)
  };
};
