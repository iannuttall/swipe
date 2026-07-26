function copyButton() {
  return {
    type: "element",
    tagName: "button",
    properties: {
      type: "button",
      className: ["code-copy"],
      dataCodeCopy: "",
      ariaLabel: "Copy code",
    },
    children: [],
  };
}

export function rehypeCodeCopy() {
  return (tree) => {
    walk(tree, (node, parent, index) => {
      if (
        node.type !== "element" ||
        node.tagName !== "pre" ||
        !parent ||
        index === undefined ||
        (parent.tagName === "div" &&
          Array.isArray(parent.properties?.className) &&
          parent.properties.className.includes("code-frame"))
      ) {
        return;
      }

      parent.children[index] = {
        type: "element",
        tagName: "div",
        properties: { className: ["code-frame"] },
        children: [node, copyButton()],
      };
    });
  };
}

function walk(node, visitor, parent, index) {
  if (!node || typeof node !== "object") return;
  visitor(node, parent, index);

  if (Array.isArray(node.children)) {
    for (let i = 0; i < node.children.length; i += 1) {
      walk(node.children[i], visitor, node, i);
    }
  }
}
