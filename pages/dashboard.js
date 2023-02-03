import React, { useState, useContext, useEffect } from 'react';
import getUser from '../lib/getUser';
import { Wrapper, NavbarCommon, InputModal, ClassCard } from '../components';
import Head from 'next/head';
import styles from '../styles/Dashboard.module.scss';
import { IoIosAdd } from 'react-icons/io';
import axios from 'axios';
import { Spinner } from 'react-bootstrap';
import { db } from '../lib/mongo';
import { toast } from 'react-toastify';
import { userContext } from '../components/userContext';

export async function getServerSideProps({ req, res }) {
  process.env.TZ = 'Asia/Kolkata';
  const user = await getUser(req, res);
  let students = [];
  if (user.usertype === 'teacher') {
    students = await db.getFields('users', { usertype: 'student' });
    students = students.map((e) => {
      delete e._id;
      return e;
    });
  }
  if (!user) {
    return {
      redirect: {
        permanent: false,
        destination: '/login',
      },
      props: {},
    };
  }
  if (user) {
    return {
      props: {
        user,
        students,
      },
    };
  }
}

export default function Dashboard({ user, students }) {
  const [classes, setclasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setmodal] = useState(false);
  console.log(user);
  const fields =
    user.usertype == 'teacher'
      ? [
          {
            name: 'cname',
            label: 'Enter class name',
            placeholder: 'Class name',
          },
          {
            name: 'desc',
            label: 'Enter class description',
            placeholder: 'Optional',
            textarea: true,
          },
        ]
      : [{ name: 'jcode', label: 'Enter joining code' }];

  async function getClasses() {
    axios.get('/api/class/get').then((e) => {
      setclasses(e.data);
      setLoading(false);
    });
  }

  useEffect(() => {
    getClasses();
  }, []);

  const handleSubmit = (data) => {
    const obj = {};
    obj.title = data.cname;
    obj.description = data.desc;
    obj.jcode = data.jcode || '';

    if (user.usertype == 'teacher') {
      obj.students = data.selectedStudents.map((e) => e.uid) || [];
      if (!data.cname) {
        toast.error('Title is required');
        return;
      }
      axios
        .post('/api/class/create', { ...obj })
        .then((res) => {
          if (res.data.cid) toast.success('Class created successfully!');
          getClasses();
        })
        .catch((e) =>
          toast.error(e.response?.data?.err || 'unknown error occured')
        );
    } else {
      if (!data.jcode) {
        toast.error('Please enter the code!');
        return;
      }
      axios
        .post('/api/class/join', { ...obj })
        .then((res) => {
          if (res.data.cid) toast.success(`Joined ${res.data?.title}!`);
          getClasses();
        })
        .catch((e) =>
          toast.error(e.response?.data?.err || 'unknown error occured')
        );
    }
  };

  return (
    <>
      <Head>
        <title>MyClassroom Dashboard</title>
      </Head>
      <NavbarCommon current="dash" user={user} />
      <Wrapper>
        <div className={styles.main}>
          <div className="px-4">
            <div className="pt-2 pb-3">
              <h4 className="mb-3">Classrooms</h4>
              {loading ? (
                <div className="p-5 mx-auto">
                  <Spinner
                    animation="border"
                    role="status"
                    variant="primary"
                    className="p-2 mx-auto"
                  />
                </div>
              ) : (
                <div className="flex flex-wrap gap-4 ml-4 w-4/5">
                  {classes.map((e, i) => (
                    <ClassCard key={i} ele={e} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <InputModal
          state={modal}
          user={user}
          fields={fields}
          students={students}
          type="dashboard"
          handleSubmit={handleSubmit}
          closeModal={() => setmodal(false)}
          title={
            user.usertype == 'teacher'
              ? 'Create a Classroom'
              : 'Join a Classroom'
          }
        />
        <div
          onClick={() => setmodal(true)}
          className="cursor-pointer shadow-md shadow-gray-400 position-fixed top-[630px] right-20 p-2 bg-[#ffb60a] rounded-full w-12 h-12"
        >
          <IoIosAdd className="text-2xl translate-x-1 translate-y-1" />
        </div>
      </Wrapper>
    </>
  );
}
