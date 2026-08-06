FROM debian:bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates spamassassin \
  && rm -rf /var/lib/apt/lists/*

ENTRYPOINT ["spamassassin"]
