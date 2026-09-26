# Make sure RUBY_VERSION matches the Ruby version in .ruby-version
ARG RUBY_VERSION=4.0.5
FROM ghcr.io/rails/devcontainer/images/ruby:$RUBY_VERSION@sha256:e1bd336b0f49207a2a235299f7163bf00687b24582b911be21a58f0e5c1198cd

LABEL org.opencontainers.image.source="https://github.com/firstdraft/drawing-board"
LABEL org.opencontainers.image.description="First Draft Drawing Board development environment"

USER root
RUN install -d -m 0755 /etc/ssh/sshd_config.d && \
    printf '%s\n' \
      'AuthenticationMethods publickey' \
      'PermitRootLogin no' \
      'PasswordAuthentication no' \
      'KbdInteractiveAuthentication no' \
      'PubkeyAuthentication yes' \
      > /etc/ssh/sshd_config.d/99-foundation.conf

USER vscode

CMD ["sleep", "infinity"]

# The Rails image installs Ruby through mise, whose activation normally happens
# only in interactive shells. Lifecycle commands are noninteractive, so expose
# both mise and its shims at the image level; the Node feature prepends its own
# pinned bin directory while preserving this path.
ENV PATH="/home/vscode/.local/bin:/home/vscode/.local/share/mise/shims:${PATH}"

# Ensure binding is always 0.0.0.0
# Binds the server to all IP addresses of the container, so it can be accessed from outside the container.
ENV BINDING="0.0.0.0"
