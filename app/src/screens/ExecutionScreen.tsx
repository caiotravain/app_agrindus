import React, { useEffect, useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, TouchableOpacity, SafeAreaView, Modal, useWindowDimensions, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import SignatureScreen from 'react-native-signature-canvas';
import * as FileSystem from 'expo-file-system';
import apiClient from '../api/client';
import { Procedure, ProcedureExecution, Stage, Step } from '../types';
import { AuthContext } from '../context/AuthContext';

const TimerStep = ({ onSave }: { onSave: (value: string) => void }) => {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (running) {
      interval = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [running]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!running && elapsed === 0) {
    return (
      <TouchableOpacity style={styles.greenButton} onPress={() => setRunning(true)}>
        <Text style={styles.greenButtonText}>Iniciar Cronômetro</Text>
      </TouchableOpacity>
    );
  }

  if (running) {
    return (
      <View style={{ alignItems: 'center', marginBottom: 15, marginTop: 10 }}>
        <Text style={{ fontSize: isTablet ? 60 : 40, fontWeight: 'bold', color: '#D32F2F', marginBottom: 15 }}>{formatTime(elapsed)}</Text>
        <TouchableOpacity style={{ ...styles.darkButton, width: '100%', backgroundColor: '#D32F2F' }} onPress={() => setRunning(false)}>
          <Text style={styles.darkButtonText}>Parar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center', marginBottom: 15, marginTop: 10 }}>
      <Text style={{ fontSize: isTablet ? 60 : 40, fontWeight: 'bold', color: '#3C2F2F', marginBottom: 15 }}>{formatTime(elapsed)}</Text>
      <TouchableOpacity style={{ ...styles.darkButton, width: '100%', backgroundColor: '#27C466' }} onPress={() => onSave(formatTime(elapsed))}>
        <Text style={styles.darkButtonText}>Salvar Tempo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={{ marginTop: 15 }} onPress={() => { setElapsed(0); setRunning(false); }}>
        <Text style={{ color: '#666', textDecorationLine: 'underline', fontSize: 16 }}>Reiniciar Cronômetro</Text>
      </TouchableOpacity>
    </View>
  );
};

const StepImagePicker = ({ onImageSelected, currentImage, isTablet }: { onImageSelected: (uri: string) => void, currentImage?: string, isTablet: boolean }) => {
  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão Negada', 'Precisamos de acesso à sua câmera para tirar fotos.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5, // Reduced quality from 0.7 to 0.5
      aspect: [4, 3],
    });

    if (!result.canceled) {
      onImageSelected(result.assets[0].uri);
    }
  };

  return (
    <View style={{ marginBottom: 15 }}>
      {currentImage ? (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: currentImage }} style={[styles.previewImage, isTablet && { height: 300 }]} />
          <TouchableOpacity style={styles.removeImageButton} onPress={pickImage}>
            <Text style={styles.removeImageText}>Alterar Foto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
          <Text style={[styles.imagePickerText, isTablet && { fontSize: 18 }]}>📷 Adicionar Foto</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const SignatureCaptureModal = ({ 
  visible, 
  onClose, 
  onSave, 
  signatureCount, 
  totalRequired = 3 
}: { 
  visible: boolean, 
  onClose: () => void, 
  onSave: (signerName: string, role: string, signatureUri: string) => void,
  signatureCount: number,
  totalRequired?: number
}) => {
  const [signerName, setSignerName] = useState('');
  const [role, setRole] = useState('');
  const signatureRef = React.useRef<any>(null);

  const handleOK = (signature: string) => {
    onSave(signerName, role, signature);
    setSignerName('');
    setRole('');
    if (signatureRef.current) {
      signatureRef.current.clearSignature();
    }
  };

  const handleEnd = () => {
    if (!signatureRef.current) return;
    signatureRef.current.readSignature();
  };

  const webStyle = `
    .m-signature-pad {box-shadow: none; border: none;} 
    .m-signature-pad--body {border: none;}
    .m-signature-pad--footer {display: none; margin: 0px;}
    body,html {height: 100%;}
  `;

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { height: '80%', maxWidth: 800, padding: 20 }]}>
          <Text style={styles.modalTitle}>Assinatura {signatureCount + 1} de {totalRequired}</Text>
          <Text style={styles.modalSub}>Por favor, insira seus dados e assine abaixo.</Text>
          
          <TextInput
            style={styles.modalInput}
            placeholder="Nome do Assinante"
            value={signerName}
            onChangeText={setSignerName}
            placeholderTextColor="#999"
          />
          <TextInput
            style={styles.modalInput}
            placeholder="Cargo / Função"
            value={role}
            onChangeText={setRole}
            placeholderTextColor="#999"
          />

          <View style={{ flex: 1, borderWidth: 1, borderColor: '#3C2F2F', borderRadius: 8, overflow: 'hidden', marginBottom: 20, backgroundColor: '#FFF' }}>
            <SignatureScreen
              ref={signatureRef}
              onOK={handleOK}
              descriptionText="Assine aqui"
              clearText="Limpar"
              confirmText="Confirmar"
              webStyle={webStyle}
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
              <Text style={styles.modalCancelText}>CANCELAR</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalConfirm, (!signerName || !role) && { opacity: 0.5 }]} 
              onPress={handleEnd}
              disabled={!signerName || !role}
            >
              <Text style={styles.modalConfirmText}>SALVAR ASSINATURA</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ExecutionScreen = ({ route, navigation }: any) => {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  
  const { execution: initialExecution } = route.params;
  
  // Ensure signatures exists
  const [execution, setExecution] = useState<ProcedureExecution>({
    ...initialExecution,
    signatures: initialExecution.signatures || []
  });
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useContext(AuthContext);

  // Form State
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [comments, setComments] = useState<Record<number, string>>({});
  const [stepImages, setStepImages] = useState<Record<number, string>>({});
  const [stageComment, setStageComment] = useState('');

  // Stage Start Modal State
  const [stageModalVisible, setStageModalVisible] = useState(false);
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [tempEmployeeCode, setTempEmployeeCode] = useState('');
  const [startingStage, setStartingStage] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);

  useEffect(() => {
    fetchProcedureDetails();
  }, []);

  useEffect(() => {
    // Reset stage comment when stage changes or is loaded
    const activeIdx = getActiveStageIndex();
    if (activeIdx !== -1 && procedure) {
      const stage = procedure.stages[activeIdx];
      const stageExec = execution.stage_executions.find((se: any) => se.stage === stage.id || se.stage.id === stage.id);
      if (stageExec) {
        setStageComment(stageExec.comment || '');
      } else {
        setStageComment('');
      }

        // Auto-fill logic for repeated/calculated steps
      const newAnswers = { ...answers };
      let changed = false;
      stage.steps.forEach(step => {
        // Skip if already in local state or already answered on server
        if (answers[step.id] !== undefined) return;
        const serverAnswer = (execution.pre_definitions || []).find((a: any) => a.step === step.id) ||
                           (execution.stage_executions || []).flatMap(se => se.answers || []).find((a: any) => a.step === step.id);
        if (serverAnswer) return;

        const qtyNum = execution.quantity || 0;
        const combinedText = (step.text + " " + (step.subtitle || "")).toLowerCase();
        
        // Improved logic for "Repete BASE" - matches "Repete BASE", "Repete o valor da BASE", etc.
        const isRepeteBase = combinedText.includes('repete') && combinedText.includes('base');

        if (isRepeteBase) {
          newAnswers[step.id] = qtyNum.toString();
          changed = true;
        } else if (combinedText.includes('{qtd}') && step.multiplier) {
          const calcVal = (qtyNum * step.multiplier).toFixed(2);
          newAnswers[step.id] = calcVal;
          changed = true;
        } else if (combinedText.includes('{calc_envase}') && step.depends_on) {
          // Dynamic calculation for bottle units
          let tankWeight = 0;
          const combinedAnswers = [
            ...(execution.pre_definitions || []),
            ...execution.stage_executions.flatMap(se => se.answers || [])
          ];
          const tankAnswer = combinedAnswers.find(a => a.step === step.depends_on);
          if (tankAnswer) {
            tankWeight = parseFloat(tankAnswer.value) || 0;
          }
          if (tankWeight === 0 && answers[step.depends_on]) {
            tankWeight = parseFloat(answers[step.depends_on]) || 0;
          }

          const packagingAnswer = execution.pre_definitions?.find((a: any) => a.value === '500g' || a.value === '130g');
          if (packagingAnswer && tankWeight > 0) {
            let units = 0;
            if (packagingAnswer.value === '500g') units = tankWeight * 2;
            else if (packagingAnswer.value === '130g') units = tankWeight / 0.13;
            
            newAnswers[step.id] = units.toFixed(0);
            changed = true;
          }
        }
      });
      if (changed) setAnswers(newAnswers);
    }
  }, [execution, procedure]);

  const fetchProcedureDetails = async () => {
    try {
      const response = await apiClient.get(`/api/procedures/${execution.procedure}/`);
      setProcedure(response.data);
    } catch (error) {
      console.error('Error fetching procedure details', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do procedimento');
    } finally {
      setLoading(false);
    }
  };

  const getActiveStageIndex = () => {
    if (!procedure) return -1;
    if (user?.user_type === 'management') return 0;
    
    for (let i = 0; i < procedure.stages.length; i++) {
      const stage = procedure.stages[i];
      const stageExec = execution.stage_executions.find((se: any) => se.stage === stage.id || se.stage.id === stage.id);
      if (!stageExec || !stageExec.end_time) {
        return i;
      }
    }
    return -1; // All done
  };

  const handleOpenStartStage = (stageId: number) => {
    if (user?.user_type !== 'factory') return;
    setSelectedStageId(stageId);
    setTempEmployeeCode('');
    setStageModalVisible(true);
  };

  const handleConfirmStartStage = async () => {
    if (!tempEmployeeCode || !selectedStageId) {
      Alert.alert('Erro', 'Por favor, insira o código do funcionário.');
      return;
    }

    setStartingStage(true);
    try {
      await apiClient.post('/api/executions/validate_employee/', { employee_code: tempEmployeeCode });
      const response = await apiClient.post(`/api/executions/${execution.id}/start_stage/`, {
        stage_id: selectedStageId,
        employee_code: tempEmployeeCode,
      });
      setExecution({
        ...response.data,
        signatures: response.data.signatures || [],
        stage_executions: response.data.stage_executions || [],
        pre_definitions: response.data.pre_definitions || []
      });
      setStageModalVisible(false);
    } catch (error: any) {
      console.error('Error starting stage', error);
      Alert.alert('Erro', error.response?.data?.error || 'Código inválido ou falha ao iniciar etapa.');
    } finally {
      setStartingStage(false);
    }
  };

  const handleSaveSignature = async (signerName: string, role: string, signatureBase64: string) => {
    try {
      const base64Code = signatureBase64.replace("data:image/png;base64,", "");
      const fileName = `signature_${Date.now()}.png`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      // Using stable module-level function
      await FileSystem.writeAsStringAsync(fileUri, base64Code, { encoding: 'base64' });

      const formData = new FormData();
      formData.append('signer_name', signerName);
      formData.append('role', role);
      formData.append('signature_image', {
        uri: fileUri,
        name: fileName,
        type: 'image/png'
      } as any);

      const response = await apiClient.post(`/api/executions/${execution.id}/submit_signature/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setExecution({
        ...response.data,
        signatures: response.data.signatures || [],
        stage_executions: response.data.stage_executions || [],
        pre_definitions: response.data.pre_definitions || []
      });
      const newSignaturesCount = (response.data.signatures || []).length;
      
      if (newSignaturesCount >= 3) {
        setSignatureModalVisible(false);
        Alert.alert('Sucesso', 'Todas as 3 assinaturas foram coletadas. Agora você pode finalizar o procedimento.');
      }
    } catch (error: any) {
      console.error('Error saving signature', error);
      Alert.alert('Erro', error.response?.data?.error || 'Falha ao salvar assinatura');
    }
  };

  const handleSubmitStep = async (stageExecutionId: number | null, stepId: number, overrideValue?: string) => {
    const value = overrideValue !== undefined ? overrideValue : answers[stepId];
    if (value === undefined || value === '') {
      Alert.alert('Validação', 'Por favor, insira um valor.');
      return;
    }

    // Find the step to check for mandatory photo
    const allSteps = procedure?.stages.flatMap(s => s.steps) || [];
    const step = allSteps.find(s => s.id === stepId);
    
    if (step?.photo_mandatory && !stepImages[stepId]) {
      // Check if it already has an image on server
      const preDefAnswer = execution.pre_definitions?.find((a: any) => a.step === stepId);
      const stageAnswer = execution.stage_executions
        .flatMap(se => se.answers || [])
        .find((a: any) => a.step === stepId);
      const answer = stageAnswer || preDefAnswer;
      
      if (!answer?.image) {
        Alert.alert('Foto Obrigatória', `O passo "${step.text}" exige uma foto.`);
        return;
      }
    }

    const formData = new FormData();
    formData.append('step_id', stepId.toString());
    formData.append('value', value);
    if (comments[stepId]) formData.append('comment', comments[stepId]);
    if (stepImages[stepId]) {
      const uri = stepImages[stepId];
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image`;
      formData.append('image', { uri, name: filename, type } as any);
    }
    if (stageExecutionId) formData.append('stage_execution_id', stageExecutionId.toString());

    try {
      let response;
      if (user?.user_type === 'management') {
        response = await apiClient.post(`/api/executions/${execution.id}/submit_pre_definition/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        if (!stageExecutionId) return;
        response = await apiClient.post(`/api/executions/${execution.id}/submit_step/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setExecution({
        ...response.data,
        signatures: response.data.signatures || [],
        stage_executions: response.data.stage_executions || [],
        pre_definitions: response.data.pre_definitions || []
      });
      Alert.alert('Sucesso', 'Resposta salva com sucesso');
    } catch (error: any) {
      console.error('Error submitting step', error);
      Alert.alert('Erro', error.response?.data?.error || 'Falha ao enviar resposta');
    }
  };

  const handleFinishStage = async (stageExecutionId: number) => {
    // Validation: check if all steps in the current stage have been answered
    if (procedure && activeIndex !== -1) {
      const currentStage = procedure.stages[activeIndex];
      const unansweredSteps = currentStage.steps.filter(step => {
        const preDefAnswer = (execution.pre_definitions || []).find((a: any) => a.step === step.id);
        const stageAnswer = (execution.stage_executions || [])
          .flatMap(se => se.answers || [])
          .find((a: any) => a.step === step.id);
        
        return !preDefAnswer && !stageAnswer;
      });

      if (unansweredSteps.length > 0) {
        Alert.alert(
          'Atenção',
          `Ainda restam ${unansweredSteps.length} passos sem resposta nesta etapa. Por favor, responda todos antes de finalizar.`
        );
        return;
      }
    }

    try {
      const response = await apiClient.post(`/api/executions/${execution.id}/finish_stage/`, {
        stage_execution_id: stageExecutionId,
        comment: stageComment
      });
      setExecution({
        ...response.data,
        signatures: response.data.signatures || [],
        stage_executions: response.data.stage_executions || [],
        pre_definitions: response.data.pre_definitions || []
      });
    } catch (error: any) {
      console.error('Error finishing stage', error);
      Alert.alert('Erro', error.response?.data?.error || 'Falha ao finalizar etapa');
    }
  };

  const handleFinishProcedure = async () => {
    if ((execution.signatures?.length || 0) < 3) {
      setSignatureModalVisible(true);
      return;
    }

    try {
      await apiClient.post(`/api/executions/${execution.id}/finish/`);
      Alert.alert('Finalizado', 'Procedimento concluído com sucesso!');
      navigation.navigate('ProceduresList');
    } catch (error: any) {
      console.error('Error finishing procedure', error);
      Alert.alert('Erro', error.response?.data?.error || 'Falha ao finalizar procedimento');
    }
  };

  const getStepSubtitle = (step: Step) => {
    const rawSub = step.subtitle || "";
    const rawTitle = step.text || "";
    const combined = rawTitle + " " + rawSub;
    
    const strip = (t: string) => t.replace('{qtd}', '').replace('{calc}', '').replace('{calc_envase}', '').replace('(Repete BASE)', '').trim();
    
    if (combined.includes('{calc}') && step.depends_on && step.multiplier) {
      let dependentVal = 0;
      const combinedAnswers = [
        ...(execution.pre_definitions || []),
        ...execution.stage_executions.flatMap(se => se.answers || [])
      ];
      const answer = combinedAnswers.find(a => a.step === step.depends_on);
      if (answer) {
        dependentVal = parseFloat(answer.value) || 0;
      }
      
      if (dependentVal === 0 && answers[step.depends_on]) {
        dependentVal = parseFloat(answers[step.depends_on]) || 0;
      }
      const calcVal = (dependentVal * step.multiplier).toFixed(2);
      
      return (
        <Text style={[styles.stepSubLabel, isTablet && { fontSize: 18, lineHeight: 28 }]}>
          {strip(rawSub) || 'Valor calculado'}: <Text style={styles.highlightedCalc}>{calcVal}</Text>
        </Text>
      );
    }
    
    if (combined.includes('{calc_envase}') && step.depends_on) {
      let tankWeight = 0;
      const combinedAnswers = [
        ...(execution.pre_definitions || []),
        ...execution.stage_executions.flatMap(se => se.answers || [])
      ];
      
      const tankAnswer = combinedAnswers.find(a => a.step === step.depends_on);
      if (tankAnswer) {
        tankWeight = parseFloat(tankAnswer.value) || 0;
      }
      
      // Get packaging choice from pre-definitions
      const packagingAnswer = execution.pre_definitions?.find((a: any) => {
        // Look for the step containing "envase" or matching the specific question
        return a.value === '500g' || a.value === '130g';
      });

      let calcVal = "0.00";
      if (packagingAnswer) {
        if (packagingAnswer.value === '500g') {
          // KG / 0.5 = KG * 2
          calcVal = (tankWeight * 2).toFixed(0);
        } else if (packagingAnswer.value === '130g') {
          // KG / 0.13 = KG * 7.6923
          calcVal = (tankWeight / 0.13).toFixed(0);
        }
      }

      return (
        <Text style={[styles.stepSubLabel, isTablet && { fontSize: 18, lineHeight: 28 }]}>
          {strip(rawSub) || 'Valor calculado'}: <Text style={styles.highlightedCalc}>{calcVal}</Text>
        </Text>
      );
    }
    
    if (combined.includes('{qtd}') && step.multiplier) {
      const calcVal = (execution.quantity * step.multiplier).toFixed(2);
      return (
        <Text style={[styles.stepSubLabel, isTablet && { fontSize: 18, lineHeight: 28 }]}>
          {strip(rawSub) || 'Valor calculado'}: <Text style={styles.highlightedCalc}>{calcVal}</Text>
        </Text>
      );
    }

    // Return stripped plain subtitle
    const cleanSub = strip(rawSub);
    return cleanSub ? <Text style={[styles.stepSubLabel, isTablet && { fontSize: 18, lineHeight: 28 }]}>{cleanSub}:</Text> : null;
  };

  const renderInputForStep = (step: Step, stageExecutionId: number | null, answer: any) => {
    if (step.expected_type === 'time') {
      return <TimerStep onSave={(timeValue) => handleSubmitStep(stageExecutionId, step.id, timeValue)} />;
    }

    if (step.expected_type === 'boolean') {
      return (
        <View>
          <View style={styles.optionsContainerRow}>
            {['Sim', 'Não'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButtonSmall,
                  answers[step.id] === option && styles.optionButtonSelected
                ]}
                onPress={() => {
                  setAnswers(prev => ({ ...prev, [step.id]: option }));
                  handleSubmitStep(stageExecutionId, step.id, option);
                }}
              >
                <Text style={[styles.optionTextSmall, answers[step.id] === option && styles.optionTextSelected]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {!step.is_pre_definition && (
            <StepImagePicker 
              onImageSelected={(uri) => {
                setStepImages(prev => ({ ...prev, [step.id]: uri }));
                if (answers[step.id]) handleSubmitStep(stageExecutionId, step.id);
              }}
              currentImage={stepImages[step.id] || answer?.image}
              isTablet={isTablet}
            />
          )}
        </View>
      );
    }

    if (step.expected_type === 'choice') {
      const options = step.options ? step.options.split(',') : [];
      return (
        <View>
          <View style={styles.optionsContainer}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  answers[step.id] === option && styles.optionButtonSelected
                ]}
                onPress={() => {
                  setAnswers(prev => ({ ...prev, [step.id]: option }));
                  handleSubmitStep(stageExecutionId, step.id, option);
                }}
              >
                <Text style={[styles.optionText, answers[step.id] === option && styles.optionTextSelected]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {!step.is_pre_definition && (
            <StepImagePicker 
              onImageSelected={(uri) => {
                setStepImages(prev => ({ ...prev, [step.id]: uri }));
                if (answers[step.id]) handleSubmitStep(stageExecutionId, step.id);
              }}
              currentImage={stepImages[step.id] || answer?.image}
              isTablet={isTablet}
            />
          )}
        </View>
      );
    }

    if (step.expected_type === 'number' || step.expected_type === 'text') {
      return (
        <>
          <TextInput
            style={styles.input}
            placeholder={answer ? `Valor atual: ${answer.value}` : "Insira o valor..."}
            placeholderTextColor="#999"
            keyboardType={step.expected_type === 'number' ? 'numeric' : 'default'}
            value={answers[step.id] || ''}
            onChangeText={(text) => setAnswers(prev => ({...prev, [step.id]: text}))}
          />
          {!step.is_pre_definition && (
            <StepImagePicker 
              onImageSelected={(uri) => setStepImages(prev => ({ ...prev, [step.id]: uri }))}
              currentImage={stepImages[step.id] || answer?.image}
              isTablet={isTablet}
            />
          )}
          <TouchableOpacity style={styles.darkButton} onPress={() => handleSubmitStep(stageExecutionId, step.id)}>
            <Text style={styles.darkButtonText}>
              {answer ? 'Atualizar Resposta' : 'Confirmar Resposta'}
            </Text>
          </TouchableOpacity>
        </>
      );
    }

    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tipo de resposta "{step.expected_type}" não suportado.</Text>
      </View>
    );
  };

  const renderStep = (step: Step, stageExecutionId: number | null, index: number) => {
    const preDefAnswer = execution.pre_definitions?.find((a: any) => a.step === step.id);
    const stageAnswer = execution.stage_executions
      .flatMap(se => se.answers || [])
      .find((a: any) => a.step === step.id);
    
    const answer = stageAnswer || preDefAnswer;
    const canEdit = (user?.user_type === 'management' && step.is_pre_definition) || 
                    (user?.user_type === 'factory' && !step.is_pre_definition && stageExecutionId);

    if (user?.user_type === 'management' && !step.is_pre_definition) return null;

    const cleanLabel = step.text.replace('{qtd}', '').replace('(Repete BASE)', '').replace('(BASE * 0,04%)', '').trim();

    return (
      <View key={step.id} style={styles.stepContainer}>
        <Text style={[styles.stepLabel, isTablet && { fontSize: 22 }]}>
          {step.is_pre_definition ? '[PRÉ-DEFINIÇÃO] ' : ''}Passo {index + 1} - {cleanLabel}
          {step.photo_mandatory && <Text style={{ color: '#D32F2F' }}> * (Foto Obrigatória)</Text>}
        </Text>
        
        {getStepSubtitle(step)}
        
        {answer && !canEdit ? (
          <View style={styles.answeredBox}>
            <Text style={[styles.answeredValue, isTablet && { fontSize: 26 }]}>{answer.value}</Text>
            {answer.comment ? <Text style={[styles.answeredComment, isTablet && { fontSize: 18 }]}>{answer.comment}</Text> : null}
          </View>
        ) : canEdit ? (
          <View style={styles.inputActionContainer}>
            {renderInputForStep(step, stageExecutionId, answer)}
          </View>
        ) : (
          <View style={styles.infoBadge}>
            <Text style={styles.infoBadgeText}>Aguardando pré-definição da gestão</Text>
          </View>
        )}
        <View style={styles.stepDivider} />
      </View>
    );
  };

  if (loading || !procedure) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3C2F2F" />
      </View>
    );
  }

  const activeIndex = getActiveStageIndex();
  
  if (activeIndex === -1 && user?.user_type === 'factory') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, isTablet && styles.headerTablet]}>
          <TouchableOpacity onPress={() => navigation.navigate('ProceduresList')} style={[styles.headerIcon, isTablet && styles.headerIconTablet]}>
            <Text style={[styles.iconPlaceholder, isTablet && styles.iconPlaceholderTablet]}>☰</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isTablet && styles.headerTitleTablet]}>Concluído</Text>
          <TouchableOpacity onPress={logout} style={[styles.logoutButton, isTablet && styles.logoutButtonTablet]}>
            <Text style={[styles.logoutText, isTablet && styles.logoutTextTablet]}>Sair</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <View style={styles.successCard}>
            <Text style={styles.title}>Etapas Concluídas!</Text>
            <Text style={styles.successSubtitle}>Você finalizou todos os requisitos deste procedimento.</Text>
            <TouchableOpacity style={styles.finishButton} onPress={handleFinishProcedure}>
              <Text style={styles.finishButtonText}>Finalizar Execução</Text>
            </TouchableOpacity>
          </View>
        </View>
        <SignatureCaptureModal
          visible={signatureModalVisible}
          onClose={() => setSignatureModalVisible(false)}
          onSave={handleSaveSignature}
          signatureCount={execution.signatures?.length || 0}
        />
      </SafeAreaView>
    );
  }

  const stagesToRender = user?.user_type === 'management' ? procedure.stages : [procedure.stages[activeIndex]];
  const currentDate = new Date().toLocaleDateString('pt-BR');

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <TouchableOpacity onPress={() => navigation.navigate('ProceduresList')} style={[styles.headerIcon, isTablet && styles.headerIconTablet]}>
          <Text style={[styles.iconPlaceholder, isTablet && styles.iconPlaceholderTablet]}>☰</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isTablet && styles.headerTitleTablet]}>
          {user?.user_type === 'management' ? 'Pre-definições' : procedure.stages[activeIndex].name}
        </Text>
        <TouchableOpacity onPress={logout} style={[styles.logoutButton, isTablet && styles.logoutButtonTablet]}>
          <Text style={[styles.logoutText, isTablet && styles.logoutTextTablet]}>Sair</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.contentContainer, isTablet && { padding: 40 }]}>
        <View style={[styles.productHeader, isTablet && { padding: 30 }]}>
          <View style={[styles.productIconContainer, isTablet && { width: 100, height: 100, borderRadius: 50 }]}>
            <Text style={[styles.productIcon, isTablet && { fontSize: 50 }]}>🥛</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.productName, isTablet && { fontSize: 28 }]}>{procedure.name}</Text>
            <Text style={[styles.productDate, isTablet && { fontSize: 18 }]}>{currentDate}</Text>
            <View style={styles.productionInfoRow}>
              <View style={[styles.infoBadge, isTablet && { paddingHorizontal: 16, paddingVertical: 10 }]}>
                <Text style={[styles.infoBadgeText, isTablet && { fontSize: 16 }]}>Qtd: {execution.quantity}</Text>
              </View>
              {execution.enclosure ? (
                <View style={[styles.infoBadge, isTablet && { paddingHorizontal: 16, paddingVertical: 10 }]}>
                  <Text style={[styles.infoBadgeText, isTablet && { fontSize: 16 }]}>Recinto: {execution.enclosure}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {stagesToRender.map((stage) => {
          const stageExec = execution.stage_executions.find((se: any) => se.stage === stage.id || se.stage?.id === stage.id);
          
          return (
            <View key={stage.id}>
              <Text style={[styles.stageBreadcrumb, isTablet && { fontSize: 22 }]}>{stage.name}</Text>
              
              {!stageExec && user?.user_type === 'factory' ? (
                <View style={[styles.startSection, isTablet && { marginTop: 40, marginBottom: 20 }]}>
                  <TouchableOpacity 
                    style={[styles.greenButton, isTablet && { minHeight: 80, paddingHorizontal: 40, borderRadius: 20 }]} 
                    onPress={() => handleOpenStartStage(stage.id)}
                  >
                    <Text style={[styles.greenButtonText, isTablet && styles.greenButtonTextTablet]}>
                      Iniciar {stage.name}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  {stageExec && (
                    <View style={styles.employeeInfoCard}>
                      <Text style={[styles.employeeInfoLabel, isTablet && { fontSize: 18 }]}>Iniciado por:</Text>
                      <Text style={[styles.employeeInfoValue, isTablet && { fontSize: 18 }]}>{stageExec.employee_name || 'Desconhecido'}</Text>
                    </View>
                  )}

                  {stage.steps.map((step, index) => renderStep(step, stageExec ? stageExec.id : null, index))}

                  {stageExec && !stageExec.end_time && user?.user_type === 'factory' && (
                    <View style={styles.stageCommentSection}>
                      <Text style={[styles.commentLabel, isTablet && { fontSize: 18 }]}>Deseja fazer alguma observação sobre a operação?</Text>
                      <TextInput
                        style={[styles.input, styles.commentInput, isTablet && { height: 140, fontSize: 18 }]}
                        placeholder="Sua observação (opcional)..."
                        placeholderTextColor="#999"
                        value={stageComment}
                        onChangeText={setStageComment}
                        multiline
                      />
                      <TouchableOpacity style={styles.greenButton} onPress={() => handleFinishStage(stageExec.id)}>
                        <Text style={styles.greenButtonText}>Finalizar Etapa</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {user?.user_type === 'management' && (
          <TouchableOpacity style={styles.finishButton} onPress={() => navigation.goBack()}>
            <Text style={styles.finishButtonText}>Voltar</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={stageModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 500 }]}>
            <Text style={styles.modalTitle}>Início de Etapa</Text>
            <Text style={styles.modalSub}>Confirme seu código de funcionário para iniciar esta etapa.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: EMP001"
              value={tempEmployeeCode}
              onChangeText={setTempEmployeeCode}
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setStageModalVisible(false)}>
                <Text style={styles.modalCancelText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirm} 
                onPress={handleConfirmStartStage}
                disabled={startingStage}
              >
                <Text style={styles.modalConfirmText}>{startingStage ? '...' : 'INICIAR'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SignatureCaptureModal
        visible={signatureModalVisible}
        onClose={() => setSignatureModalVisible(false)}
        onSave={handleSaveSignature}
        signatureCount={execution.signatures?.length || 0}
      />
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
    flex: 1,
    textAlign: 'center',
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
  contentContainer: {
    padding: 16,
    paddingBottom: 60,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 900,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  productIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3C2F2F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  productIcon: {
    fontSize: 30,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3C2F2F',
  },
  productDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  productionInfoRow: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  infoBadge: {
    backgroundColor: '#3C2F2F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 6,
  },
  infoBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    height: 2,
    backgroundColor: '#3C2F2F',
    marginBottom: 25,
    borderRadius: 2,
  },
  stageBreadcrumb: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3C2F2F',
    marginBottom: 25,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  employeeInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27C466',
    marginBottom: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeInfoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3C2F2F',
    marginRight: 6,
  },
  employeeInfoValue: {
    fontSize: 14,
    color: '#3C2F2F',
    fontWeight: 'bold',
  },
  stepContainer: {
    marginBottom: 30,
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3C2F2F',
    marginBottom: 8,
  },
  stepSubLabel: {
    fontSize: 14,
    color: '#3C2F2F',
    marginBottom: 15,
    lineHeight: 20,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3C2F2F',
    marginBottom: 8,
    marginTop: 8,
  },
  highlightedCalc: {
    color: '#27C466',
    fontWeight: '900',
    fontSize: 16,
  },
  inputActionContainer: {
    marginTop: 5,
  },
  input: {
    height: 50,
    borderWidth: 2,
    borderColor: '#3C2F2F',
    borderRadius: 12,
    paddingHorizontal: 15,
    backgroundColor: '#F9F9F9',
    fontSize: 16,
    color: '#3C2F2F',
    marginBottom: 15,
  },
  commentInput: {
    height: 80,
    paddingTop: 12,
    fontSize: 14,
    borderColor: '#BBB',
    borderWidth: 1,
  },
  optionsContainer: {
    marginTop: 5,
  },
  optionsContainerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  optionButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#3C2F2F',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  optionButtonSmall: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#3C2F2F',
    borderRadius: 12,
    paddingVertical: 14,
    width: '48%',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionButtonSelected: {
    backgroundColor: '#3C2F2F',
  },
  optionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3C2F2F',
  },
  optionTextSmall: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3C2F2F',
  },
  optionTextSelected: {
    color: '#FFF',
  },
  errorContainer: {
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D32F2F',
  },
  errorText: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: 14,
  },
  darkButton: {
    backgroundColor: '#3C2F2F',
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  darkButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  greenButton: {
    backgroundColor: '#27C466',
    minHeight: 55,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  greenButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  greenButtonTextTablet: {
    fontSize: 22,
    letterSpacing: 1.5,
  },
  answeredBox: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#27C466',
  },
  answeredValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27C466',
  },
  answeredComment: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
    marginTop: 8,
  },
  imagePickerButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#3C2F2F',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  imagePickerText: {
    fontSize: 16,
    color: '#3C2F2F',
    fontWeight: 'bold',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#EEE',
  },
  removeImageButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  removeImageText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepDivider: {
    height: 0,
    marginTop: 5,
  },
  stageCommentSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#FFF5E9',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FFCC80',
  },
  startSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5E9',
  },
  successCard: {
    padding: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: 600,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#27C466',
    marginBottom: 15,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  finishButton: {
    backgroundColor: '#3C2F2F',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    elevation: 4,
  },
  finishButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF5E9',
    width: '100%',
    maxWidth: 500,
    padding: 25,
    borderRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3C2F2F',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalInput: {
    height: 55,
    borderWidth: 2,
    borderColor: '#3C2F2F',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 18,
    marginBottom: 20,
    backgroundColor: '#FFF',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancel: {
    flex: 1,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  modalCancelText: {
    color: '#3C2F2F',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalConfirm: {
    flex: 1,
    height: 45,
    backgroundColor: '#3C2F2F',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default ExecutionScreen;