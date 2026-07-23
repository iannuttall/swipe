export default function noopSessionDriver() {
  return {
    async get() {
      return undefined;
    },
    async set() {},
    async delete() {},
  };
}
