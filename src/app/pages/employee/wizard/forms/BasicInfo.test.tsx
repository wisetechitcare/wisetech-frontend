// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { Formik } from 'formik';
import { afterEach, describe, expect, it } from 'vitest';
import BasicInfo from './BasicInfo';

afterEach(cleanup);

describe('BasicInfo gender', () => {
  it('lays the five gender choices out in a wrapping row with nothing preselected', () => {
    render(
      <Formik initialValues={{ gender: '' }} onSubmit={() => undefined}>
        {(formikProps) => <form><BasicInfo formikProps={formikProps} /></form>}
      </Formik>,
    );
    const group = screen.getByRole('radiogroup', { name: /gender/i });
    expect(group.getAttribute('aria-required')).toBe('true');
    const style = getComputedStyle(group);
    expect(style.flexDirection).toBe('row');
    expect(style.flexWrap).toBe('wrap');
    const radios = screen.getAllByRole('radio').filter((radio) => group.contains(radio));
    expect(radios.map((radio) => (radio as HTMLInputElement).value)).toEqual(['MALE', 'FEMALE', 'OTHER', 'NON_BINARY', 'PREFER_NOT_TO_SAY']);
    expect(radios.some((radio) => (radio as HTMLInputElement).checked)).toBe(false);
  });
});
