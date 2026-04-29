import { createSlice } from '@reduxjs/toolkit';
import { UAParser } from 'ua-parser-js';

const parser = new UAParser();
const result = parser.getResult();

const safeResult = {
  ua: result.ua,
  browser: {
    name: result.browser?.name || '',
    version: result.browser?.version || '',
    major: result.browser?.major || '',
  },
  engine: {
    name: result.engine?.name || '',
    version: result.engine?.version || '',
  },
  os: {
    name: result.os?.name || '',
    version: result.os?.version || '',
  },
  device: {
    vendor: result.device?.vendor || '',
    model: result.device?.model || '',
    type: result.device?.type || '',
  },
  cpu: {
    architecture: result.cpu?.architecture || '',
  },
};

const userAgentSlice = createSlice({
  name: 'userAgent',
  initialState: {
    userAgent: safeResult,
  },
  reducers: {
    setUserAgent: (state, action) => {
      state.userAgent = action.payload;
    },
  },
});

export const { setUserAgent } = userAgentSlice.actions;
export default userAgentSlice.reducer;