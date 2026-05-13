import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import apiClient from '../api/client';
import { Procedure, Step } from '../types';
import { AuthContext } from '../context/AuthContext';

const PreDefinitionWizardScreen = ({ route, navigation }: any) => {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  
  const { procedure } = route.params as { procedure: Procedure };
  const { logout } = useContext(AuthContext);
  
  const preDefSteps = procedure.stages.flatMap(s => s.steps).filter(step => step.is_pre_definition);
  
  const [currentStepIndex, setCurrentStepIndex] = useState(-1); // -1 for initial generic info
  const [quantity, setQuantity] = useState('');
  const [enclosure, setEnclosure] = useState('');
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [stepAnswers, setStepAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculate values when reaching a step or quantity changes
  useEffect(() => {
    if (currentStepIndex >= 0 && currentStepIndex < preDefSteps.length) {
      const step = preDefSteps[currentStepIndex];
      const qtyNum = parseFloat(quantity) || 0;
      const combinedText = (step.text + " " + (step.subtitle || "")).toLowerCase();

      // Simple, proven logic for "Repete BASE"
      if (combinedText.includes('repete base') && !stepAnswers[step.id]) {
        setStepAnswers(prev => ({ ...prev, [step.id]: quantity }));
      }
      
      // Simple, proven logic for "{qtd}"
      if (combinedText.includes('{qtd}') && step.multiplier && !stepAnswers[step.id]) {
        const calcVal = (qtyNum * step.multiplier).toFixed(2);
        setStepAnswers(prev => ({ ...prev, [step.id]: calcVal }));
      }
    }
  }, [currentStepIndex, quantity]);

  const totalSteps = preDefSteps.length + 1; // +1 for the generic info step

  const handleNext = () => {
    if (currentStepIndex === -1) {
      if (!quantity || !plannedDate) {
        Alert.alert('Erro', 'Data e Quantidade são obrigatórias.');
        return;
      }
      setCurrentStepIndex(0);
    } else if (currentStepIndex < preDefSteps.length) {
      const step = preDefSteps[currentStepIndex];
      if (!stepAnswers[step.id]) {
        Alert.alert('Erro', 'Por favor, preencha este campo.');
        return;
      }
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > -1) {
      setCurrentStepIndex(currentStepIndex - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      // 1. Create the scheduled execution
      const execRes = await apiClient.post('/api/executions/', {
        procedure: procedure.id,
        quantity: parseFloat(quantity),
        enclosure: enclosure,
        planned_date: plannedDate
      });
      
      const executionId = execRes.data.id;
      
      // 2. Submit all pre-definitions
      for (const step of preDefSteps) {
        const formData = new FormData();
        formData.append('step_id', step.id.toString());
        formData.append('value', stepAnswers[step.id]);
        
        await apiClient.post(`/api/executions/${executionId}/submit_pre_definition/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      
      Alert.alert('Sucesso', 'Produção programada com sucesso!');
      navigation.navigate('ProceduresList');
    } catch (error) {
      console.error('Error scheduling production', error);
      Alert.alert('Erro', 'Falha ao programar a produção.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepTitle = (step: Step) => {
    const strip = (t: string) => t.replace('{qtd}', '').replace('(Repete BASE)', '').replace('(BASE * 0,04%)', '').trim();
    
    let title = strip(step.text);
    let sub = strip(step.subtitle || "");
    const qtyNum = parseFloat(quantity) || 0;

    const combinedText = (step.text + " " + (step.subtitle || "")).toLowerCase();

    if (step.multiplier && combinedText.includes('{qtd}')) {
       const calcVal = (qtyNum * step.multiplier).toFixed(2);
       return (
         <View>
           <Text style={[styles.stepTitle, isTablet && { fontSize: 32 }]}>{title}</Text>
           <Text style={[styles.stepInstruction, isTablet && { fontSize: 20 }]}>
             {sub || 'Valor calculado'} 
             <Text style={{ color: '#27C466', fontWeight: '900' }}> ({calcVal})</Text>
           </Text>
         </View>
       );
    }
    
    return (
      <View>
        <Text style={[styles.stepTitle, isTablet && { fontSize: 32 }]}>{title}</Text>
        {sub ? <Text style={[styles.stepInstruction, isTablet && { fontSize: 20 }]}>{sub}</Text> : null}
      </View>
    );
  }

  const renderProgress = () => {
    const progress = ((currentStepIndex + 2) / (totalSteps + 1)) * 100;
    return (
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
    );
  };

  const renderContent = () => {
    if (currentStepIndex === -1) {
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, isTablet && { fontSize: 32 }]}>Informações Gerais</Text>
          
          <Text style={[styles.inputLabel, isTablet && { fontSize: 18 }]}>Data Planejada (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.input, isTablet && { height: 65, fontSize: 20 }]}
            value={plannedDate}
            onChangeText={setPlannedDate}
            placeholder="Ex: 2026-04-30"
          />

          <Text style={[styles.inputLabel, isTablet && { fontSize: 18 }]}>Quantidade de BASE (Litros/Kg)</Text>
          <TextInput
            style={[styles.input, isTablet && { height: 65, fontSize: 20 }]}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="Ex: 500"
            keyboardType="numeric"
          />

          <Text style={[styles.inputLabel, isTablet && { fontSize: 18 }]}>Recinto / Tanque</Text>
          <TextInput
            style={[styles.input, isTablet && { height: 65, fontSize: 20 }]}
            value={enclosure}
            onChangeText={setEnclosure}
            placeholder="Ex: Tanque 01"
          />
        </View>
      );
    }

    if (currentStepIndex < preDefSteps.length) {
      const step = preDefSteps[currentStepIndex];
      const options = step.options ? step.options.split(',') : [];

      return (
        <View style={styles.stepContent}>
          {getStepTitle(step)}
          <Text style={[styles.stepInstruction, isTablet && { fontSize: 20 }]}>
            Escolha ou insira o valor para este passo:
          </Text>
          
          {step.expected_type === 'choice' && options.length > 0 ? (
            <View style={styles.optionsContainer}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    isTablet && { paddingVertical: 20 },
                    stepAnswers[step.id] === option && styles.optionButtonSelected
                  ]}
                  onPress={() => setStepAnswers(prev => ({ ...prev, [step.id]: option }))}
                >
                  <Text style={[
                    styles.optionText,
                    isTablet && { fontSize: 22 },
                    stepAnswers[step.id] === option && styles.optionTextSelected
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TextInput
              style={[styles.input, isTablet && { height: 65, fontSize: 20 }]}
              value={stepAnswers[step.id] || ''}
              onChangeText={(text) => setStepAnswers(prev => ({ ...prev, [step.id]: text }))}
              placeholder="Insira o valor..."
              keyboardType={step.expected_type === 'number' ? 'numeric' : 'default'}
              autoFocus
            />
          )}
        </View>
      );
    }

    // Summary Screen
    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, isTablet && { fontSize: 32 }]}>Resumo da Programação</Text>
        
        <View style={[styles.summaryCard, isTablet && { padding: 30 }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isTablet && { fontSize: 18 }]}>Procedimento:</Text>
            <Text style={[styles.summaryValue, isTablet && { fontSize: 18 }]}>{procedure.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isTablet && { fontSize: 18 }]}>Data:</Text>
            <Text style={[styles.summaryValue, isTablet && { fontSize: 18 }]}>{plannedDate}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isTablet && { fontSize: 18 }]}>Quantidade:</Text>
            <Text style={[styles.summaryValue, isTablet && { fontSize: 18 }]}>{quantity}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, isTablet && { fontSize: 18 }]}>Tanque:</Text>
            <Text style={[styles.summaryValue, isTablet && { fontSize: 18 }]}>{enclosure || 'N/A'}</Text>
          </View>
          
          <Text style={[styles.summaryLabel, { marginTop: 15, marginBottom: 5 }, isTablet && { fontSize: 18 }]}>Pré-definições:</Text>
          {preDefSteps.map(step => (
            <View key={step.id} style={styles.preDefRow}>
              <Text style={[styles.preDefText, isTablet && { fontSize: 16 }]}>• {step.text.replace('{qtd}', '').replace('(Repete BASE)', '').replace('(BASE * 0,04%)', '').trim()}: <Text style={{ fontWeight: 'bold' }}>{stepAnswers[step.id]}</Text></Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <TouchableOpacity onPress={handleBack} style={[styles.headerIcon, isTablet && styles.headerIconTablet]}>
          <Text style={[styles.iconPlaceholder, isTablet && styles.iconPlaceholderTablet]}>☰</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isTablet && styles.headerTitleTablet]}>Programação</Text>
        <TouchableOpacity onPress={logout} style={[styles.logoutButton, isTablet && styles.logoutButtonTablet]}>
          <Text style={[styles.logoutText, isTablet && styles.logoutTextTablet]}>Sair</Text>
        </TouchableOpacity>
      </View>

      {renderProgress()}

      <ScrollView contentContainerStyle={[styles.scrollContent, isTablet && { padding: 40 }]}>
        <View style={{ alignSelf: 'center', width: '100%', maxWidth: 800 }}>
          {renderContent()}
        </View>
      </ScrollView>

      <View style={[styles.footer, isTablet && { padding: 40 }]}>
        <View style={{ alignSelf: 'center', width: '100%', maxWidth: 800 }}>
          {currentStepIndex < preDefSteps.length ? (
            <TouchableOpacity style={[styles.nextButton, isTablet && { height: 65 }]} onPress={handleNext}>
              <Text style={[styles.nextButtonText, isTablet && { fontSize: 22 }]}>PRÓXIMO</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.nextButton, { backgroundColor: '#27C466' }, isTablet && { height: 65 }]} 
              onPress={handleFinish}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={[styles.nextButtonText, isTablet && { fontSize: 22 }]}>FINALIZAR</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E9',
  },
  header: {
    height: 60,
    backgroundColor: '#3C2F2F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  headerTablet: {
    height: 90,
    paddingHorizontal: 25,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitleTablet: {
    fontSize: 28,
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconTablet: {
    width: 60,
    height: 60,
  },
  iconPlaceholder: {
    color: '#FFF',
    fontSize: 24,
  },
  iconPlaceholderTablet: {
    fontSize: 34,
  },
  logoutButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonTablet: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 12,
  },
  logoutText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  logoutTextTablet: {
    fontSize: 20,
  },
  progressContainer: {
    height: 6,
    backgroundColor: '#E0E0E0',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#27C466',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 25,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3C2F2F',
    marginBottom: 10,
  },
  stepInstruction: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3C2F2F',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    height: 55,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#3C2F2F',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 18,
    color: '#3C2F2F',
  },
  optionsContainer: {
    marginTop: 10,
  },
  optionButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#3C2F2F',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 15,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#3C2F2F',
  },
  optionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3C2F2F',
  },
  optionTextSelected: {
    color: '#FFF',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFF5E9',
  },
  nextButton: {
    backgroundColor: '#3C2F2F',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3C2F2F',
    marginTop: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  summaryValue: {
    fontSize: 14,
    color: '#3C2F2F',
    fontWeight: 'bold',
  },
  preDefRow: {
    marginBottom: 5,
  },
  preDefText: {
    fontSize: 13,
    color: '#3C2F2F',
  },
  });

  export default PreDefinitionWizardScreen;