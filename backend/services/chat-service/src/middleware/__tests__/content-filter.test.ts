import { checkContentViolations } from '../content-filter';

describe('ContentFilterMiddleware / checkContentViolations', () => {
  it('should pass for clean messages', () => {
    const content = 'Hello, how are you?';
    const result = checkContentViolations(content);
    expect(result.isClean).toBe(true);
  });

  it('should flag messages with phone numbers', () => {
    const contents = [
      'Call me at 123-456-7890',
      'My number is +1 987 654 3210',
      'Reach me on 9876543210'
    ];

    contents.forEach(content => {
      const result = checkContentViolations(content);
      expect(result.hasPhone).toBe(true);
      expect(result.isClean).toBe(false);
    });
  });

  it('should flag messages with email addresses', () => {
    const contents = [
      'Email me at test@example.com',
      'My contact is user.name_123@domain.co.uk',
    ];

    contents.forEach(content => {
      const result = checkContentViolations(content);
      expect(result.hasEmail).toBe(true);
      expect(result.isClean).toBe(false);
    });
  });

  it('should flag messages with external links', () => {
    const contents = [
      'Check this out: https://malicious-site.com',
      'Visit www.competitor.io for better prices',
      'go to google.com'
    ];

    contents.forEach(content => {
      const result = checkContentViolations(content);
      expect(result.hasLink).toBe(true);
      expect(result.isClean).toBe(false);
    });
  });
});
