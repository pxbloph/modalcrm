import React from "react";
import { useFormContext } from "react-hook-form";
import { User, Shield } from "lucide-react";
import { ModalInput } from "./ModalUI";
import { ClientDealFormValues } from "./schemas";
import { cn } from "@/lib/utils";

export function ClientForm({ isBlocked }: { isBlocked?: boolean }) {
    const { register, formState: { errors } } = useFormContext<ClientDealFormValues>();

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Inputs */}
            <div className="space-y-4">
                <ModalInput
                    label="Razão Social / Nome"
                    placeholder="Nome completo"
                    disabled={isBlocked}
                    {...register("client.name")}
                    error={errors.client?.name?.message}
                />

                <div className="grid grid-cols-2 gap-4">
                    <ModalInput
                        label="CNPJ / CPF"
                        placeholder="00.000.000/0000-00"
                        disabled={isBlocked}
                        {...register("client.cnpj")}
                    />
                    <ModalInput
                        label="Telefone"
                        placeholder="(00) 00000-0000"
                        disabled={isBlocked}
                        {...register("client.phone")}
                    />
                </div>

                <ModalInput
                    label="Email"
                    type="email"
                    placeholder="cliente@email.com"
                    disabled={isBlocked}
                    {...register("client.email")}
                    error={errors.client?.email?.message}
                />
            </div>
        </div>
    );
}
