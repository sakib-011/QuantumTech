package com.quantumtech.backend.service;

import com.quantumtech.backend.dto.PaymentMethodInfo;
import com.quantumtech.backend.model.PaymentMethod;
import com.quantumtech.backend.model.StoreSettings;
import com.quantumtech.backend.repository.SettingsRepository;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Payment options offered at checkout. bKash and Nagad are "Send Money" to the store's number
 * (configured by the admin in store settings) followed by manual TrxID verification; a wallet is
 * only available once its receiving number is set.
 */
@Component
public class PaymentMethodCatalog {
    private final SettingsRepository settings;

    public PaymentMethodCatalog(SettingsRepository settings) {
        this.settings = settings;
    }

    public List<PaymentMethodInfo> methods() {
        StoreSettings store = settings.findById("store").orElseGet(StoreSettings::new);
        return List.of(cod(), wallet(PaymentMethod.BKASH, "বিকাশ", "*247#", store.getBKashNumber()),
                wallet(PaymentMethod.NAGAD, "নগদ", "*167#", store.getNagadNumber()));
    }

    public boolean isAvailable(String method) {
        return methods().stream().anyMatch(m -> m.code().equals(method) && m.available());
    }

    private PaymentMethodInfo cod() {
        return new PaymentMethodInfo(PaymentMethod.COD, "Cash on Delivery", "ক্যাশ অন ডেলিভারি",
                true, false, null,
                List.of("Pay the full amount in cash to the delivery person when you receive your order.",
                        "Please keep your phone reachable; we will call to confirm the order."),
                List.of("পণ্য হাতে পেয়ে ডেলিভারি কর্মীকে সম্পূর্ণ টাকা নগদে পরিশোধ করুন।",
                        "অর্ডার নিশ্চিত করতে আমরা ফোন করব, অনুগ্রহ করে ফোন খোলা রাখুন।"));
    }

    private PaymentMethodInfo wallet(String code, String nameBn, String ussd, String number) {
        boolean available = number != null && !number.isBlank();
        String target = available ? number.trim() : "our " + code + " number";
        String targetBn = (available ? number.trim() : "আমাদের " + nameBn) + " নম্বরে";
        return new PaymentMethodInfo(code, code, nameBn, available, true, available ? number.trim() : null,
                List.of("Open the " + code + " app or dial " + ussd + ".",
                        "Choose \"Send Money\" and send the order total to " + target + ".",
                        "Confirm with your PIN and note the Transaction ID (TrxID) from the confirmation message.",
                        "Enter the TrxID and the number you paid from, then place your order.",
                        "We verify the payment and confirm your order, usually within a few hours."),
                List.of(nameBn + " অ্যাপ খুলুন অথবা " + ussd + " ডায়াল করুন।",
                        "\"Send Money\" নির্বাচন করে মোট টাকা " + targetBn + " পাঠান।",
                        "পিন দিয়ে নিশ্চিত করুন এবং কনফার্মেশন মেসেজ থেকে ট্রানজেকশন আইডি (TrxID) সংগ্রহ করুন।",
                        "TrxID এবং যে নম্বর থেকে টাকা পাঠিয়েছেন তা লিখে অর্ডার করুন।",
                        "পেমেন্ট যাচাই করে আমরা আপনার অর্ডার নিশ্চিত করব, সাধারণত কয়েক ঘণ্টার মধ্যে।"));
    }
}
