import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { backend as supabase } from "@/integrations/neon/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Bug, HelpCircle, Loader2, Mail, MessageSquare, Send } from "lucide-react";

export default function Support() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    category: "",
    priority: "medium",
    description: "",
    email: "",
  });

  const categories = [
    { value: "bug_interface", label: "Bug na Interface", icon: Bug },
    { value: "bug_funcionalidade", label: "Bug em Funcionalidade", icon: Bug },
    { value: "erro_login", label: "Erro no Login/Autenticação", icon: Bug },
    { value: "erro_dados", label: "Erro ao Salvar Dados", icon: Bug },
    { value: "performance", label: "Problema de Performance", icon: Bug },
    { value: "sugestao", label: "Sugestão de Melhoria", icon: MessageSquare },
    { value: "duvida", label: "Dúvida/Ajuda", icon: HelpCircle },
    { value: "outro", label: "Outro", icon: Mail },
  ];

  const priorities = [
    { value: "low", label: "Baixa", color: "text-green-600" },
    { value: "medium", label: "Média", color: "text-yellow-600" },
    { value: "high", label: "Alta", color: "text-orange-600" },
    { value: "critical", label: "Crítica", color: "text-red-600" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.category || !formData.description || !formData.email) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Aqui você pode salvar em uma tabela do Supabase ou enviar por email
      // Por enquanto, vamos apenas simular o envio
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast.success("Solicitação de suporte enviada com sucesso!");
      
      // Limpar formulário
      setFormData({
        subject: "",
        category: "",
        priority: "medium",
        description: "",
        email: "",
      });

    } catch (error) {
      console.error("Erro ao enviar suporte:", error);
      toast.error("Erro ao enviar solicitação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Central de Suporte</h1>
          <p className="text-muted-foreground">
            Relate bugs, envie sugestões ou tire suas dúvidas
          </p>
        </div>

        <Alert>
          <HelpCircle className="h-4 w-4" />
          <AlertDescription>
            Nossa equipe de suporte analisará sua solicitação e entrará em contato em até 48 horas.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Formulário de Suporte</CardTitle>
            <CardDescription>
              Preencha os campos abaixo com o máximo de detalhes possível
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    E-mail para contato <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                {/* Categoria */}
                <div className="space-y-2">
                  <Label htmlFor="category">
                    Categoria <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => {
                        const Icon = cat.icon;
                        return (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {cat.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Assunto */}
                <div className="space-y-2">
                  <Label htmlFor="subject">
                    Assunto <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="subject"
                    placeholder="Descreva brevemente o problema"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>

                {/* Prioridade */}
                <div className="space-y-2">
                  <Label htmlFor="priority">
                    Prioridade <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          <span className={priority.color}>{priority.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Descrição detalhada <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o problema com o máximo de detalhes possível. Se for um bug, inclua:&#10;- O que você estava tentando fazer&#10;- O que aconteceu&#10;- O que você esperava que acontecesse&#10;- Passos para reproduzir o problema&#10;- Mensagens de erro (se houver)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={8}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Quanto mais detalhes você fornecer, mais rápido poderemos resolver o problema.
                </p>
              </div>

              {/* Informações do Bug */}
              {formData.category.startsWith("bug_") && (
                <Alert>
                  <Bug className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Dica para reportar bugs:</strong> Inclua informações sobre o navegador que você está usando,
                    quando o erro ocorreu, e se possível, tire uma captura de tela do problema.
                  </AlertDescription>
                </Alert>
              )}

              {/* Botões */}
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Solicitação
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Informações de Contato Adicional */}
        <Card>
          <CardHeader>
            <CardTitle>Outras formas de contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">E-mail direto</p>
                <p className="text-sm text-muted-foreground">suporte@sesisenai.com.br</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Horário de atendimento</p>
                <p className="text-sm text-muted-foreground">Segunda a Sexta, 8h às 18h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
