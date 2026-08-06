#!/bin/sh
cat >/dev/null
cat <<'EOF'
X-Spam-Checker-Version: SpamAssassin 4.0.1
X-Spam-Status: No, score=0.1 required=5.0 tests=HTML_MESSAGE
 autolearn=no autolearn_force=no version=4.0.1

Content analysis details: (0.1 points, 5.0 required)

 pts rule name              description
---- ---------------------- --------------------------------------------
 0.1 HTML_MESSAGE           BODY: HTML included in message
EOF
