# Spec Delta

## MODIFIED Requirements

### Requirement: Pane split persistence

At and above the `md` breakpoint (48em) the spec pane and the tree SHALL sit side by side with a draggable divider, the spec pane taking 20% by default, at least 18%, and leaving the tree at least 35%. When a drag ends, the spec pane's share MUST be stored in `localStorage` under `jsl-split-spectrace` and applied on later visits to either page. A stored value that is not a number strictly between 0 and 100 is ignored. Below the breakpoint the panes are stacked, spec first, without a divider. The page MUST arrive from the server in the orientation it keeps after loading: a request whose `Sec-CH-UA-Mobile` header is `?1`, or that has no such header and a phone's user agent, is rendered stacked, any other request side by side.

#### Scenario: Divider dragged

- **WHEN** the divider is dragged so the spec pane takes 30% and the page is reloaded
- **THEN** `jsl-split-spectrace` holds `30` and the spec pane takes 30% again

#### Scenario: Unusable stored value

- **WHEN** `jsl-split-spectrace` holds `0` or text that is not a number
- **THEN** the spec pane takes 20%

#### Scenario: Desktop browser

- **WHEN** `/equality` is opened in a 1440 px wide desktop browser
- **THEN** the spec pane and the tree are side by side in the server's HTML and stay so after loading
