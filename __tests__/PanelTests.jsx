import '@testing-library/jest-dom';
import React from 'react';
import {render, screen} from '@testing-library/react';
import Panel from '../src/components/Panel/Panel.jsx';

test('renders', () => {
  render(<Panel />);
  expect(true).toBeTruthy();
});