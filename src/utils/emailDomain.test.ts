import { describe, test, expect } from 'vitest';
import { EMAIL_FORMAT } from './emailDomain';

describe('EMAIL_FORMAT', () => {
  test.each([
    'akram@gmail.com', 'first.last@wisetechgroup.co.in', "o'brien@mail.com", 'a+tag@x.io', 'A_B-c@sub-domain.example.org',
  ])('accepts %s', (e) => expect(EMAIL_FORMAT.test(e)).toBe(true));

  test.each([
    'a@b', 'a..b@x.com', '.a@x.com', 'a.@x.com', 'a@-x.com', 'a@x-.com', 'a@x..com', 'a b@x.com', 'a@x.c', 'a@x.com.', '@x.com', 'a@',
  ])('rejects %s', (e) => expect(EMAIL_FORMAT.test(e)).toBe(false));
});
