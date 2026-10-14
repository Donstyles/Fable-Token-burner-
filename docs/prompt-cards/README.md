# Prompt cards

One file per image the owner generates in ChatGPT. Each card has the exact
prompt to paste (style prefix included), the required framing, the output
spec, and where the returned image goes. Returned images are uploaded in chat;
Claude moves them to `pipeline/inbox/<asset-id>.<ext>` and runs the matching
pipeline tool.
