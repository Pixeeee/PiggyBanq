package com.anonymous.piggybanq.test;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.accessibility.AccessibilityNodeInfo;
import java.net.HttpURLConnection;
import java.net.URL;

/** Run only on a disposable QA emulator: creates an unfunded wallet and test account. */
public class NativeParityInstrumentation extends Instrumentation {
  @Override public void onCreate(Bundle arguments) { super.onCreate(arguments); start(); }

  @Override public void onStart() {
    Bundle result = new Bundle();
    try {
      Intent intent = getTargetContext().getPackageManager().getLaunchIntentForPackage("com.anonymous.piggybanq");
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getTargetContext().startActivity(intent);
      click("Create wallet");
      fill("Username", "native_" + Long.toString(System.currentTimeMillis(), 36));
      fill("Create new password", "NativeQA!Password2026");
      fill("Confirm password", "NativeQA!Password2026");
      click("If I lose this password, PiggyBanq cannot reset it.");
      click("Create password");
      click("Tap to reveal your wallet backup");
      click("I saved my wallet backup in a safe place.");
      click("Continue");
      step("Native wallet and backup created.");
      click("Receive quick action");
      String publicKey = publicAddress(getUiAutomation().getRootInActiveWindow());
      if (publicKey == null || !publicKey.matches("G[A-Z2-7]{55}")) throw new AssertionError("QA public address is unavailable.");
      click("Close Receive on Testnet");
      HttpURLConnection friendbot = (HttpURLConnection) new URL("https://friendbot.stellar.org?addr=" + publicKey).openConnection();
      friendbot.setConnectTimeout(15000);
      friendbot.setReadTimeout(45000);
      try {
        if (friendbot.getResponseCode() != 200) throw new AssertionError("Testnet Friendbot funding failed.");
        friendbot.getInputStream().close();
      } finally { friendbot.disconnect(); }
      click("Send tab");
      click("Review USDC trustline");
      fill("Signing password", "NativeQA!Password2026");
      click("Confirm and sign on device");
      waitFor("Confirmed on Stellar Testnet.", 90000);
      click("Swap");
      fill("Send amount", "1");
      click("Review swap");
      waitFor("Minimum received", 30000);
      fill("Signing password", "NativeQA!Password2026");
      click("Confirm and sign on device");
      waitFor("Confirmed on Stellar Testnet.", 90000);
      step("Actual native USDC trustline and XLM to USDC swap confirmed on Testnet.");
      click("Agent");
      click("Preview agent intent");
      waitFor("Approve agent intent", 15000);
      click("Approve agent intent");
      click("Execute agent sandbox");
      waitFor("Sandbox execution completed. No real funds moved.", 15000);
      click("Send");
      click("Agent");
      click("Open X402_PAYMENT 5.00 USDC SUCCEEDED");
      step("Native agent preview, approval, sandbox execution and persisted receipt verified.");
      click("Sync tab");
      click("Connect web account");
      click("Sign and create web account");
      waitFor("Synced with your web account. Planning records do not move funds.", 90000);
      step("Reviewed native signing and API cookie session verified.");
      click("Paid API");
      click("Preview test API payment");
      waitFor("Amount: 0.0001 XLM · Stellar Testnet", 90000);
      click("Approve API payment");
      fill("API payment local password", "NativeQA!Password2026");
      click("Sign locally and pay for API");
      waitFor("Payment verified on Stellar Testnet. Result recovered without another payment.", 90000);
      click("Goals & budget");
      click("Paid API");
      waitFor("Payment verified on Stellar Testnet. Result recovered without another payment.", 90000);
      step("Real native x402 payment and persisted verified receipt recovered without a second payment.");
      click("Goals & budget");
      click("Add shared goal or allocation");
      fill("Shared category name", "Native parity QA");
      fill("Shared amount", "25.50");
      click("Save shared allocation");
      waitFor("Edit shared Native parity QA", 90000);
      step("Shared allocation persisted.");
      click("Pockets");
      click("Create shared pocket");
      fill("Pocket name", "Native parity pocket");
      click("Create demo pocket");
      click("Record credit for Native parity pocket");
      fill("Recorded amount", "10.25");
      click("Save pocket activity");
      waitFor("XLM 10.25 recorded", 90000);
      step("Shared pocket creation and credit persisted.");
      click("Profile");
      click("Edit shared profile");
      fill("Display name", "Native verified saver");
      fill("Bio", "Created by native Android release test");
      click("Save shared profile");
      waitFor("Created by native Android release test", 90000);
      step("Shared profile persisted.");
      click("You tab");
      click("Lock wallet");
      waitFor("Unlock wallet", 15000);
      fill("Password", "NativeQA!Password2026");
      click("Unlock wallet");
      step("Local wallet lock and SecureStore password unlock verified.");
      click("Sync tab");
      waitFor("Connect web account", 15000);
      click("Connect web account");
      click("Sign and connect account");
      waitFor("Synced with your web account. Planning records do not move funds.", 90000);
      waitFor("Edit shared Native parity QA", 15000);
      Intent home = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getTargetContext().startActivity(home);
      SystemClock.sleep(1500);
      getTargetContext().startActivity(intent);
      waitFor("Unlock wallet", 15000);
      step("Automatic background wallet lock verified.");
      result.putString("stream", "PASS: native wallet and backup, live Testnet trustline and swap, agent approval, real x402 payment and verified receipt recovery, signed API login/cookies, shared allocations/pockets/profile, unlock/reconnect and background lock.\n");
      finish(Activity.RESULT_OK, result);
    } catch (Throwable failure) {
      // Never dump the accessibility tree: the recovery screen can contain private keys.
      result.putString("stream", "FAIL: " + failure.getMessage() + "\n");
      finish(Activity.RESULT_CANCELED, result);
    }
  }

  private String publicAddress(AccessibilityNodeInfo node) {
    if (node == null) return null;
    CharSequence description = node.getContentDescription();
    String prefix = "Your Stellar public address: ";
    if (description != null && description.toString().startsWith(prefix)) return description.toString().substring(prefix.length());
    for (int i = 0; i < node.getChildCount(); i++) {
      String found = publicAddress(node.getChild(i));
      if (found != null) return found;
    }
    return null;
  }

  private void step(String message) {
    Bundle status = new Bundle();
    status.putString("stream", message + "\n");
    sendStatus(1, status);
  }

  private AccessibilityNodeInfo match(AccessibilityNodeInfo node, String label) {
    return match(node, label, false);
  }

  private AccessibilityNodeInfo match(AccessibilityNodeInfo node, String label, boolean editable) {
    if (node == null) return null;
    if ((!editable || node.isEditable()) && (label.contentEquals(node.getContentDescription() == null ? "" : node.getContentDescription()) ||
        label.contentEquals(node.getText() == null ? "" : node.getText()))) return node;
    for (int i = 0; i < node.getChildCount(); i++) {
      AccessibilityNodeInfo found = match(node.getChild(i), label, editable);
      if (found != null) return found;
    }
    return null;
  }

  private AccessibilityNodeInfo waitFor(String label, long timeout) {
    return waitFor(label, timeout, false);
  }

  private AccessibilityNodeInfo waitFor(String label, long timeout, boolean editable) {
    long deadline = SystemClock.uptimeMillis() + timeout;
    while (SystemClock.uptimeMillis() < deadline) {
      AccessibilityNodeInfo found = match(getUiAutomation().getRootInActiveWindow(), label, editable);
      if (found != null) return found;
      AccessibilityNodeInfo root = getUiAutomation().getRootInActiveWindow();
      scroll(root);
      SystemClock.sleep(350);
    }
    String detail = "";
    for (String known : new String[] {"Request failed (HTTP 429).", "Session expired.", "Server session belongs to a different wallet.", "Wallet password is incorrect."}) {
      if (match(getUiAutomation().getRootInActiveWindow(), known) != null) detail = " Visible error: " + known;
    }
    throw new AssertionError("Timed out waiting for: " + label + detail);
  }

  private boolean scroll(AccessibilityNodeInfo node) {
    if (node == null) return false;
    for (int i = 0; i < node.getChildCount(); i++) if (scroll(node.getChild(i))) return true;
    return node.isScrollable() && node.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD);
  }

  private void click(String label) {
    AccessibilityNodeInfo node = waitFor(label, 90000);
    long deadline = SystemClock.uptimeMillis() + 90000;
    while (!node.isEnabled() && SystemClock.uptimeMillis() < deadline) { SystemClock.sleep(200); node = waitFor(label, 90000); }
    while (node != null && !node.isClickable()) node = node.getParent();
    if (node == null || !node.isEnabled() || !node.performAction(AccessibilityNodeInfo.ACTION_CLICK)) throw new AssertionError("Cannot activate: " + label);
    step("Activated: " + label);
    SystemClock.sleep(500);
  }

  private void fill(String label, String value) {
    AccessibilityNodeInfo node = waitFor(label, 15000, true);
    Bundle arguments = new Bundle();
    arguments.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, value);
    if (!node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)) throw new AssertionError("Cannot fill: " + label);
    SystemClock.sleep(300);
  }
}
