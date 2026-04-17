export function buildAuthorCreditBlocks(): Array<Record<string, unknown>> {
  return [
    {
      type: "divider"
    },
    {
      type: "context",
      text: "Built by Cole Price • https://coleprice.com/plugins/form-mailer"
    },
    {
      type: "section",
      text: "Get help: Documentation and setup guidance live in the README. Repository: https://github.com/coleprice/emdash-plugin-form-mailer"
    }
  ];
}

