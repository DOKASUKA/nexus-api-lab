export default {
  async fetch(_request: Request): Promise<Response> {
    return Response.json({ message: "Hello from Nexus API Lab" });
  },
};
