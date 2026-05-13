import React, { useEffect, useState, useContext, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, Alert, SafeAreaView, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/client';
import { Procedure, ProcedureExecution } from '../types';
import { AuthContext } from '../context/AuthContext';

const ProceduresListScreen = ({ navigation }: any) => {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const isLargeTablet = width > 1024;
  
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [executions, setExecutions] = useState<ProcedureExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useContext(AuthContext);

  // Modal State for Factory (Starting)
  const [startModalVisible, setStartModalVisible] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<ProcedureExecution | null>(null);
  const [employeeCode, setEmployeeCode] = useState('');
  const [starting, setStarting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [procRes, execRes] = await Promise.all([
        apiClient.get('/api/procedures/'),
        apiClient.get('/api/executions/')
      ]);
      setProcedures(procRes.data);
      setExecutions(execRes.data);
    } catch (error) {
      console.error('Error fetching data', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleProcedurePress = (procedure: Procedure) => {
    if (user?.user_type === 'management') {
      navigation.navigate('PreDefinitionWizard', { procedure });
    }
  };

  const handleExecutionPress = (execution: ProcedureExecution) => {
    if (execution.status === 'in_progress') {
      navigation.navigate('Execution', { execution, employeeCode: '' });
    } else if (execution.status === 'scheduled') {
      setSelectedExecution(execution);
      setEmployeeCode('');
      setStartModalVisible(true);
    }
  };

  const handleStartExecution = async () => {
    if (!employeeCode) {
      Alert.alert('Erro', 'Por favor, insira seu código de funcionário.');
      return;
    }

    setStarting(true);
    try {
      await apiClient.post('/api/executions/validate_employee/', { employee_code: employeeCode });
      const response = await apiClient.post('/api/executions/start/', { 
        execution_id: selectedExecution?.id
      });
      const execution: ProcedureExecution = response.data;

      setStartModalVisible(false);
      navigation.navigate('Execution', { execution, employeeCode });
    } catch (error: any) {
      console.error('Error starting execution', error);
      Alert.alert('Erro', error.response?.data?.error || 'Código inválido ou erro no servidor.');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3C2F2F" />
      </View>
    );
  }

  const currentDate = new Date().toLocaleDateString('pt-BR');

  const numColumnsProcedures = isLargeTablet ? 4 : isTablet ? 3 : 2;
  const numColumnsExecutions = isTablet ? 2 : 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isTablet && styles.headerTablet]}>
        <TouchableOpacity onPress={fetchData} style={[styles.headerIcon, isTablet && styles.headerIconTablet]}>
          <Text style={[styles.iconPlaceholder, isTablet && styles.iconPlaceholderTablet]}>☰</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isTablet && styles.headerTitleTablet]}>Letti - {user?.user_type === 'management' ? 'Gestão' : 'Fábrica'}</Text>
        <TouchableOpacity onPress={logout} style={[styles.logoutButton, isTablet && styles.logoutButtonTablet]}>
          <Text style={[styles.logoutText, isTablet && styles.logoutTextTablet]}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.content, { alignSelf: 'center', width: '100%', maxWidth: 1200 }]}>
        <Text style={styles.dateText}>{currentDate}</Text>
        
        {user?.user_type === 'management' ? (
          <>
            <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>Escolha o Procedimento</Text>
            <FlatList
              key={numColumnsProcedures} // Force re-render on column change
              data={procedures}
              keyExtractor={(item) => item.id.toString()}
              numColumns={numColumnsProcedures}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.gridCard, isTablet && styles.gridCardTablet, { width: `${100 / numColumnsProcedures - 2}%` }]} 
                  onPress={() => handleProcedurePress(item)}
                >
                  <View style={[styles.gridIconContainer, isTablet && styles.gridIconContainerTablet]}>
                    <Text style={[styles.productIcon, isTablet && { fontSize: 40 }]}>🥛</Text>
                  </View>
                  <Text style={[styles.gridProductName, isTablet && styles.gridProductNameTablet]}>{item.name}</Text>
                </TouchableOpacity>
              )}
              onRefresh={fetchData}
              refreshing={loading}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </>
        ) : (
          <>
            <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>Produções Programadas</Text>
            <FlatList
              key={numColumnsExecutions} // Force re-render on column change
              data={executions.filter(e => e.status !== 'completed')}
              keyExtractor={(item) => item.id.toString()}
              numColumns={numColumnsExecutions}
              renderItem={({ item }) => {
                const procedure = procedures.find(p => p.id === item.procedure);
                const isInProgress = item.status === 'in_progress';
                return (
                  <View style={[styles.procedureCard, isTablet && { width: '48.5%', alignSelf: 'flex-start' }]}>
                    <View style={styles.productInfo}>
                      <View style={styles.productIconContainer}>
                        <Text style={styles.productIcon}>🥛</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productName}>{procedure?.name || 'Carregando...'}</Text>
                        <Text style={styles.productDesc}>{item.enclosure || 'Sem tanque'}</Text>
                        <Text style={styles.plannedDate}>Data: {item.planned_date}</Text>
                        {isInProgress && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>EM ANDAMENTO</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <TouchableOpacity 
                      style={[styles.startButton, isInProgress && styles.continueButton]} 
                      onPress={() => handleExecutionPress(item)}
                    >
                      <Text style={styles.startButtonText}>
                        {isInProgress ? 'Continuar Fabricação' : 'Iniciar Fabricação'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
              onRefresh={fetchData}
              refreshing={loading}
              columnWrapperStyle={isTablet ? styles.gridRow : undefined}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </>
        )}
      </View>

      {/* Factory Start Modal */}
      <Modal visible={startModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 500 }]}>
            <Text style={styles.modalTitle}>Iniciar Fabricação</Text>
            <Text style={styles.modalSub}>Iniciando {procedures.find(p => p.id === selectedExecution?.procedure)?.name}</Text>
            
            <Text style={styles.inputLabel}>Código do Funcionário</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: EMP001"
              value={employeeCode}
              onChangeText={setEmployeeCode}
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setStartModalVisible(false)}>
                <Text style={styles.modalCancelText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirm} 
                onPress={handleStartExecution}
                disabled={starting}
              >
                <Text style={styles.modalConfirmText}>{starting ? '...' : 'INICIAR'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  content: {
    flex: 1,
    padding: 15,
  },
  dateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3C2F2F',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3C2F2F',
    marginBottom: 20,
  },
  sectionTitleTablet: {
    fontSize: 26,
    marginBottom: 30,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  gridCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3C2F2F',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 12,
  },
  gridCardTablet: {
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
  },
  gridIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3C2F2F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridIconContainerTablet: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  gridProductName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#3C2F2F',
    textAlign: 'center',
  },
  gridProductNameTablet: {
    fontSize: 18,
  },
  procedureCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  productIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3C2F2F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productIcon: {
    fontSize: 24,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3C2F2F',
    flexShrink: 1,
  },
  productDesc: {
    fontSize: 13,
    color: '#D32F2F',
    fontWeight: 'bold',
    marginTop: 2,
    maxWidth: 200,
  },
  plannedDate: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#FFF0F0',
    borderColor: '#D32F2F',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  startButton: {
    backgroundColor: '#27C466',
    width: '100%',
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  continueButton: {
    backgroundColor: '#3C2F2F',
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5E9',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF5E9',
    width: '100%',
    padding: 20,
    borderRadius: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3C2F2F',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    height: 45,
    borderWidth: 1,
    borderColor: '#3C2F2F',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    marginBottom: 15,
    backgroundColor: '#FFF',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#3C2F2F',
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancel: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  modalCancelText: {
    color: '#3C2F2F',
    fontWeight: 'bold',
    fontSize: 13,
  },
  modalConfirm: {
    flex: 1,
    height: 40,
    backgroundColor: '#3C2F2F',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
});

export default ProceduresListScreen;