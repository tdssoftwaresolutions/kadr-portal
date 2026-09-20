# Troubleshooting

## PDF generation fails on bare-metal EC2 (Puppeteer / Chrome missing shared libraries)

**Symptom:** Signing the final mediation agreement (second party OTP verify) fails
with a generic error instead of showing the confirmation message. `pm2` logs
(`kadr-api-error.log`) show:

```
Unhandled Error: Error: Failed to launch the browser process:  Code: 127
stderr:
/home/ec2-user/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome: error while
loading shared libraries: libatk-1.0.so.0: cannot open shared object file: No such
file or directory
```

**Cause:** Puppeteer (used in [backend/utils/pdfFromHtml.js](../backend/utils/pdfFromHtml.js)
to render the mediation agreement PDF) downloads its own Chrome binary, but Amazon
Linux doesn't ship the shared libraries Chrome needs to run. This only affects the
bare-metal EC2 + `pm2` deployment — the Docker image (`deploy/Dockerfile`) already
installs Alpine's `chromium` package and sets `PUPPETEER_EXECUTABLE_PATH`, so it
isn't affected.

**Fix — install Google Chrome and its dependencies on the EC2 host:**

```bash
sudo tee /etc/yum.repos.d/google-chrome.repo <<'EOF'
[google-chrome]
name=google-chrome
baseurl=https://dl.google.com/linux/chrome/rpm/stable/x86_64
enabled=1
gpgcheck=1
gpgkey=https://dl.google.com/linux/linux_signing_key.pub
EOF
sudo yum install -y google-chrome-stable
```

Then point Puppeteer at the system Chrome instead of its own downloaded one, by
adding this to the server's `.env`:

```bash
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

Restart the app (`pm2 restart kadr-api`) after setting it.

If you'd rather keep using Puppeteer's bundled Chrome (skip the repo/env var
above), installing just the missing shared libraries also works — this is the
canonical RHEL/CentOS/Fedora/Amazon Linux dependency list from Puppeteer's own
troubleshooting guide (https://pptr.dev/troubleshooting):

```bash
sudo yum install -y \
  alsa-lib.x86_64 atk.x86_64 cups-libs.x86_64 gtk3.x86_64 ipa-gothic-fonts \
  libXcomposite.x86_64 libXcursor.x86_64 libXdamage.x86_64 libXext.x86_64 \
  libXi.x86_64 libXrandr.x86_64 libXScrnSaver.x86_64 libXtst.x86_64 pango.x86_64 \
  xorg-x11-fonts-100dpi xorg-x11-fonts-75dpi xorg-x11-fonts-cyrillic \
  xorg-x11-fonts-misc xorg-x11-fonts-Type1 xorg-x11-utils
```

(On Amazon Linux 2023, `yum` is aliased to `dnf`; both work.)

**Note:** even after this is fixed on the server, any case whose agreement
signing hit this error before the fix will be stuck partway through — the
signer's OTP/signature was recorded, but the PDF/notification/invoice step
never completed (see the code fix in `submitAgreementSignature` in
[backend/controller/signatureController.js](../backend/controller/signatureController.js),
which now alerts via email — `ALERT_TECH_TEAM_EMAILS` — instead of silently
failing on future occurrences). Any case affected before this fix needs a
one-off manual fix/regeneration.
