/**
 * @format
 */

import React from "react";
import ReactTestRenderer from "react-test-renderer";
import App from "../src/os/App";

test("renders OS shell", async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
