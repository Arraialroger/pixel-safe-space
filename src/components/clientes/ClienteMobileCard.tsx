import { MoreVertical, Pencil, Trash2, MessageCircle, Mail } from "lucide-react";
import type { Client } from "@/pages/Clientes";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { haptic } from "@/lib/haptics";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

interface Props {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

export default function ClienteMobileCard({ client, onEdit, onDelete }: Props) {
  const whatsappUrl = buildWhatsAppUrl(client.phone);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{client.name}</p>
          {(client.company || client.document) && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {client.company ?? "—"}{client.company && client.document ? " · " : ""}{client.document ?? ""}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { haptic(10); onEdit(client); }}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => { haptic(10); onDelete(client); }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {(client.email || client.phone) && (
        <div className="text-xs text-muted-foreground space-y-1">
          {client.email && <p className="truncate">{client.email}</p>}
          {client.phone && <p>{client.phone}</p>}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
          disabled={!whatsappUrl}
          asChild={!!whatsappUrl}
        >
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => haptic(10)}>
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          ) : (
            <span><MessageCircle className="h-3.5 w-3.5" />WhatsApp</span>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={!client.email}
          asChild={!!client.email}
        >
          {client.email ? (
            <a href={`mailto:${client.email}`} onClick={() => haptic(10)}>
              <Mail className="h-3.5 w-3.5" />
              E-mail
            </a>
          ) : (
            <span><Mail className="h-3.5 w-3.5" />E-mail</span>
          )}
        </Button>
      </div>
    </Card>
  );
}
