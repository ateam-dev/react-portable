import React, { HTMLAttributes } from "react";
import { styled } from "@storybook/theming";
import { SyntaxHighlighter, DocumentWrapper } from "@storybook/components";

export const Wrapper = styled(DocumentWrapper)`
  padding: 16px;
`;

export const Table = styled((props: HTMLAttributes<HTMLTableElement>) => (
  <table {...props} />
))`
  min-width: 360px;
`;

export interface PanelContentProps {
  strategy?: {
    revalidate?: number | boolean;
    hydrate?: string;
  };
  code: string;
  path: string;
  gateway?: string;
}

/**
 * Checkout https://github.com/storybookjs/storybook/blob/next/code/addons/jest/src/components/Panel.tsx
 * for a real world example
 */
export const PanelContent: React.FC<PanelContentProps> = ({
  code,
  path,
  gateway,
  strategy,
}) => {
  return (
    <Wrapper>
      <h3>Component Code</h3>
      <SyntaxHighlighter language="html" copyable>{`<react-portable ${
        gateway ? `gateway="${gateway}" ` : ""
      }entry="${code}:${path}"></react-portable>`}</SyntaxHighlighter>

      <hr />

      <h3>Strategy</h3>
      <Table>
        <thead>
          <tr>
            <th>key</th>
            <th>value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>hydrate</td>
            <td>
              <code>
                {strategy?.hydrate !== undefined ? strategy.hydrate : "-"}
              </code>
            </td>
          </tr>
          <tr>
            <td>revalidate</td>
            <td>
              <code>
                {strategy?.revalidate !== undefined ? strategy.revalidate : "-"}
              </code>
            </td>
          </tr>
        </tbody>
      </Table>
    </Wrapper>
  );
};
